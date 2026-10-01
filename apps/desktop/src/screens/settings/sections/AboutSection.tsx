import { useEffect, useState } from 'react';
import { tokens } from '@taik/ui-tokens';
import { getVersion } from '@tauri-apps/api/app';

export function AboutSection() {
  const [version, setVersion] = useState<string>('v0.1.0');

  useEffect(() => {
    getVersion()
      .then((v) => setVersion(`v${v}`))
      .catch(() => {});
  }, []);

  return (
    <section>
      <h2
        style={{
          fontSize: tokens.fontSize.lg,
          fontWeight: tokens.fontWeight.semibold,
          marginBottom: tokens.space.lg,
        }}
      >
        About
      </h2>

      <div
        style={{
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.md,
          padding: tokens.space.lg,
        }}
      >
        <div style={{ marginBottom: tokens.space.md }}>
          <span style={{ fontWeight: tokens.fontWeight.semibold }}>Taik</span>
          <span style={{ color: tokens.color.textSubtle, marginLeft: tokens.space.sm }}>
            {version}
          </span>
        </div>
        <p
          style={{
            fontSize: tokens.fontSize.sm,
            color: tokens.color.textSubtle,
          }}
        >
          Speech-to-text for everyone. Built with Tauri, React, and Soniox.
        </p>
      </div>
    </section>
  );
}

