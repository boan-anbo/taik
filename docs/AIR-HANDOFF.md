# Air development handoff

## Checkpoint

The private source checkpoint is `fb57229` (parent `e8b35b5`). The native iOS
prototype checkpoint is `c8a4cf0`. The public snapshot includes both as source,
without the old history or a dangling private gitlink.

Existing recording/transcription/desktop modifications were checkpointed,
not newly implemented or functionally revalidated. No Rust or Apple build was
run during this handoff. Begin by inspecting the chosen client and running its
affected tests/build on Air; do not treat publication as a release verdict.

## Requested next workflow

Bo wants a low-friction Watch / iPhone recording workflow:

1. One-tap capture; preserve audio locally when offline.
2. Automatic eventual delivery to a private inbox, with visible delivery state.
3. Reuse the existing transcription processing rather than require repeated
   Share actions or build a second transcription authority.
4. Preserve original audio and raw transcripts; edited summaries stay separate.

This is the next design direction, not a claim that Watch support or an inbox
uploader already exists. First assess reusable Taik components and whether a
mature recorder plus a bridge suffices before expanding the native client.

## Boundaries

- Do not put NAS credentials, provider keys, recordings, or private transcripts
  into this public repo.
- NAS is storage; processing belongs on an appropriate compute host.
- Do not overwrite recordings or mark uploads complete before a receipt.
- Do not automatically delete originals after transcription.
- Keep desktop / React Native / native Swift alternatives distinct until a
  deliberate client choice is made; this handoff does not merge their designs.

## Exclusions

- The private audio fixture and Android debug keystore remain local.
- Untracked legacy Electron archive, runtime logs, and empty shell artifacts
  remain local; tracked Electron source is included.
- Native iOS user-specific Xcode state is not included.
- Existing API key in a web story was replaced with an empty default. The owner
  should rotate that previously embedded credential separately.

## Air tools

Codex was upgraded using its existing npm installation. `cx` comes from the
current dotfiles main and delegates to `codex-switch`; the latter was built
from canonical source on Air. Existing sessions and auth files were preserved.
Use `codex --version`, `cx account-rows`, and `cx c --account default --print`
to check the installed path before launching a new development session.
