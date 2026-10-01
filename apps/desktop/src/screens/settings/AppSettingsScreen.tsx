import { AboutSection } from './sections/AboutSection';

export function AppSettingsScreen() {
  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">App Settings</h1>
      </div>

      <div style={{ maxWidth: 600 }}>
        <AboutSection />
      </div>
    </div>
  );
}
