# NERO VanillaPXY Integration

This repository is the NERO-side integration workspace for VanillaPXY.

## Status

- Initial architecture and compatibility review completed.
- Original upstream source: [Portal-NetworkDev/VanilliaPXY](https://github.com/Portal-NetworkDev/VanilliaPXY).
- No upstream source files have been copied. The upstream repository currently has no license file or declared license, so redistribution or adaptation must wait for permission or an explicit license from its owner.
- NERO production is out of scope. Integration testing belongs in `beans-jusfine/ubg-site-dev`.

See [docs/architecture.md](docs/architecture.md) for the integration plan and the Wisp compatibility boundary.

## Intended outcome

NERO should offer VanillaPXY as a selectable browsing engine alongside Scramjet, while preserving Scramjet as the default and retaining NERO's existing Wisp service for transports that use it.
