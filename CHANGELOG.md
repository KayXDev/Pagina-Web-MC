# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Newsletter system (subscribe/unsubscribe, admin manual send, automated cron send, logs).
- Admin settings for automated jobs (newsletter + service status reporting).
- Security policy for vulnerability reporting.

### Changed

- Automated scheduling adapted for Vercel Hobby limits (single daily cron + internal gating).
- Newsletter email content forced to English.

### Fixed

- Email template compatibility improvements (embedded icon via CID).
- Payment icons rendering issues (including AmEx).
