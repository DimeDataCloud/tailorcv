export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
};

export type ExtraLink = { label: string; url: string };

// Design details stored on a session row. Color fields drive the body color
// palette; detail fields drive the structural / typographic choices. A
// "preset" (Antique, Modern, etc.) populates all of these at once — the
// color-only customisation step on ResumeDesignScreen only overrides the
// four color fields below and never touches the detail fields.
export type BulletStyle = 'disc' | 'dash' | 'check' | 'diamond' | 'square';
export type DividerStyle = 'rule' | 'space' | 'dots' | 'none';
export type BorderStyle = 'none' | 'thin' | 'thick' | 'double' | 'shadow';
export type TextureStyle = 'flat' | 'paper' | 'linen' | 'gradient';
export type FontPair = 'serif' | 'sans' | 'display' | 'mono';
export type IconUsage = 'none' | 'subtle' | 'prominent';

export type ResumeDesignPrefs = {
  // Color fields (customisable on ResumeDesignScreen)
  accent: string;
  sidebar: string;
  background: string;
  text: string;
  // Detail fields (locked in by the chosen style preset)
  bullet?: BulletStyle;
  divider?: DividerStyle;
  border?: BorderStyle;
  texture?: TextureStyle;
  font?: FontPair;
  icons?: IconUsage;
  accentFontWeight?: 600 | 700 | 800;
  headerAlign?: 'left' | 'center';
  sidebarWidth?: 0 | 30 | 35 | 40;
};

export type WorkHistoryEntry = {
  title: string;     // job title (e.g. "Senior Account Executive")
  company: string;   // employer (e.g. "Globex")
  dates: string;     // date range (e.g. "2022 - Present")
  bullets: string;   // newline-separated bullet lines
};

export type ResumeProfile = {
  name: string;
  title: string;
  email: string;
  phone: string;
  linkedin: string;
  location: string;
  skills: string;
  tools: string;
  education: string;
  workHistory: WorkHistoryEntry[];
  extraLinks: ExtraLink[];
};

export type HomeStackParamList = {
  HomeMain: undefined;
  TemplateLibrary: undefined;
  JobURL: { designPrefs?: ResumeDesignPrefs };
  ResumeUpload: {
    sessionId: string;
    jobTitle: string;
    companyName: string;
    userId: string;
  };
  ResumeProfile: {
    sessionId: string;
    sourceResumeId: string;
    jobTitle: string;
    companyName: string;
    extractedText: string;
  };
  ResumeDesign: {
    sessionId: string;
    sourceResumeId: string;
    jobTitle: string;
    companyName: string;
    designPrefs?: ResumeDesignPrefs;
  };
  InsiderContext: {
    sessionId: string;
    sourceResumeId: string;
    jobTitle: string;
    companyName: string;
  };
  Processing: {
    sessionId: string;
    companyName: string;
  };
  Result: {
    sessionId: string;
  };
};

export type HistoryStackParamList = {
  HistoryList: undefined;
  HistoryResult: { sessionId: string };
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};
