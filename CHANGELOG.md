# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions
follow [Semantic Versioning](https://semver.org/). This file is generated at
each release from the Conventional Commits: do not edit it by hand.

## [0.1.0] - 2026-11-10

### Added

- **devices:** one device per pool of the iopool account, read through the official iopool public API with the API key of the app: water temperature, pH, redox (ORP), recommended daily filtration, whether iopool asks for an action, and the pool mode
- **scenes:** triggers on a new measure, an action required or resolved, a pool mode change, a new filtration advice and measures that stop for 24 hours (not in passive wintering); a "read a pool" scene action for messages and conditions
- **widget:** the pool water at a glance: temperature, pH, redox and filtration tiles, a chart of one of them, what iopool asks, the pool mode and how the latest measure was taken
- **configuration:** a "Test the API key" button, a reading every 5 to 60 minutes (10 by default) and the language of the texts
- **i18n:** English, French, German and Spanish for the manifest, the runtime texts, the documentation and the README

[0.1.0]: https://github.com/William-De71/gladys-iopool/releases/tag/v0.1.0
