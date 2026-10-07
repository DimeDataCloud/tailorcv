import { useEffect, useState } from 'react';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { ActivityIndicator, View, Platform, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';

import { supabase } from './lib/supabase';
import { AuthStackParamList, HomeStackParamList, HistoryStackParamList, MainTabParamList } from './types/navigation';

import WelcomeScreen from './screens/auth/WelcomeScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import SignInScreen from './screens/auth/SignInScreen';

import HomeScreen from './screens/tabs/HomeScreen';
import HistoryScreen from './screens/tabs/HistoryScreen';
import ProfileScreen from './screens/tabs/ProfileScreen';

import TemplateLibraryScreen from './screens/wizard/TemplateLibraryScreen';
import JobURLScreen from './screens/wizard/JobURLScreen';
import ResumeUploadScreen from './screens/wizard/ResumeUploadScreen';
import ResumeProfileScreen from './screens/wizard/ResumeProfileScreen';
import ResumeDesignScreen from './screens/wizard/ResumeDesignScreen';
import InsiderContextScreen from './screens/wizard/InsiderContextScreen';
import ProcessingScreen from './screens/wizard/ProcessingScreen';
import ResultScreen from './screens/wizard/ResultScreen';
import { BRAND } from './lib/brand';
import { HelmetProvider } from 'react-helmet-async';

// HistoryNavigator — wraps HistoryScreen + ResultScreen so History tab
// can open a resume without cross-stack navigation
function HistoryNavigator() {
  return (
    <HistoryStack.Navigator screenOptions={{ headerShown: false }}>
      <HistoryStack.Screen name="HistoryList" component={HistoryScreen} />
      <HistoryStack.Screen name="HistoryResult" component={ResultScreen} />
    </HistoryStack.Navigator>
  );
}

const AuthStack = createStackNavigator<AuthStackParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const HistoryStack = createStackNavigator<HistoryStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
    </AuthStack.Navigator>
  );
}

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="TemplateLibrary" component={TemplateLibraryScreen} />
      <HomeStack.Screen name="JobURL" component={JobURLScreen} />
      <HomeStack.Screen name="ResumeUpload" component={ResumeUploadScreen} />
      <HomeStack.Screen name="ResumeProfile" component={ResumeProfileScreen} />
      <HomeStack.Screen name="ResumeDesign" component={ResumeDesignScreen} />
      <HomeStack.Screen name="InsiderContext" component={InsiderContextScreen} />
      <HomeStack.Screen name="Processing" component={ProcessingScreen} />
      <HomeStack.Screen name="Result" component={ResultScreen} />
    </HomeStack.Navigator>
  );
}

const TAB_ICONS_ACTIVE: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  History: 'time',
  Profile: 'person',
};
const TAB_ICONS_INACTIVE: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  History: 'time-outline',
  Profile: 'person-outline',
};

function MainNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: BRAND.accent,
        tabBarInactiveTintColor: BRAND.muted,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: BRAND.hairline,
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons
            name={focused ? TAB_ICONS_ACTIVE[route.name] : TAB_ICONS_INACTIVE[route.name]}
            size={22}
            color={color}
          />
        ),
      })}
    >
      <MainTab.Screen name="Home" component={HomeNavigator} />
      <MainTab.Screen name="History" component={HistoryNavigator} />
      <MainTab.Screen name="Profile" component={ProfileScreen} />
    </MainTab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // Model download happens lazily when BOT MODE is first used (lib/modelManager.ts),
  // not on app startup — prevents native module issues from blocking app launch.

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={BRAND.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        {session ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
