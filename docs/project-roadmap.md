# Skillmark - Project Roadmap

## Project Status

**Current Version:** 0.1.0 (In Development)
**Launch Target:** Q1 2025
**Last Updated:** February 2025

## Phase Overview

```
Phase 1: MVP (v0.1)      [████████████░░] 70% Complete
Phase 2: Persistence     [████░░░░░░░░░░] Planned
Phase 3: Advanced UX     [░░░░░░░░░░░░░░] Planned
Phase 4: Scale & Polish  [░░░░░░░░░░░░░░] Planned
```

---

## Phase 1: MVP - Core Platform (v0.1)

**Status:** In Development
**Target:** Late February 2025
**Success Criteria:** CLI functional, API working, basic leaderboard UI

### CLI Package (skillmark)

#### Sprint 1A: Skill Source Resolution ✓ Complete
- [x] Local filesystem handler
- [x] Git repository cloning
- [x] skill.sh registry resolution
- [x] Unified source resolver router
- [x] Cache management (~/.skillmark/cache/)

#### Sprint 1B: Test Definition Loading ✓ Complete
- [x] Markdown parser (gray-matter YAML)
- [x] Test schema validation
- [x] Auto-discovery (tests/ directory)
- [x] Explicit path support (--tests flag)

#### Sprint 1C: Benchmark Engine ✓ Complete
- [x] Claude CLI executor
- [x] Transcript JSONL parser
- [x] Token extraction (input/output)
- [x] Cost calculation
- [x] Concept accuracy scorer (70% threshold)
- [x] Metrics aggregation (multi-run averaging)

#### Sprint 1D: Enhancement Pipeline (IN PROGRESS)
- [x] Skill content collector
- [x] skill-creator invoker
- [x] Enhanced prompt builder
- [x] Retry with graceful degradation
- [ ] Performance optimization
- [ ] Error handling edge cases

#### Sprint 1E: Output & Publishing
- [ ] JSON result generation
- [ ] Markdown report generation
- [ ] API key configuration (config-reader)
- [ ] Publish command (POST /api/results)
- [ ] View leaderboard command

### Webapp Package (@skillmark/webapp)

#### Sprint 1F: API Core
- [ ] POST /api/results (submit benchmarks with full metrics)
- [ ] GET /api/result/:id (full benchmark detail)
- [ ] GET /api/leaderboard (paginated rankings)
- [ ] GET /api/skill/:name (skill details with full metrics per result)
- [ ] GET /api/verify (API key validation)
- [ ] Error handling & validation
- [ ] Request logging

#### Sprint 1G: Authentication (Basic)
- [ ] GitHub OAuth flow (OAuth2 initiate)
- [ ] OAuth callback handling
- [ ] Session token generation
- [ ] GET /auth/me (current user)
- [ ] Basic API key management

#### Sprint 1H: UI (Static)
- [ ] Leaderboard page (rankings table)
- [ ] Skill detail page (radar chart, expandable results with per-test breakdown)
- [ ] Filter by model (haiku/sonnet/opus)
- [ ] Sort by accuracy/cost/speed
- [ ] Responsive design (mobile)
- [ ] CSS styling

#### Sprint 1I: Database Setup
- [ ] D1 SQLite schema
- [ ] Results table
- [ ] Users table
- [ ] API keys table
- [ ] Indexes for performance

### Documentation (Current Sprint)
- [x] Project overview & PDR
- [x] Codebase summary
- [x] Code standards
- [x] System architecture
- [x] Project roadmap
- [ ] Deployment guide
- [x] API reference (`docs/api-reference.md`)

### Success Metrics (Phase 1)

| Metric | Target | Status |
|--------|--------|--------|
| CLI runs 5-test benchmark | <5 min | In Progress |
| Accuracy calculation accuracy | 100% | In Progress |
| API response time | <500ms | Not Started |
| Leaderboard render | <2s | Not Started |
| Test coverage | ≥70% | Not Started |
| Documentation completeness | 100% | In Progress |

---

## Phase 2: Data Persistence & User Features (v0.2)

**Target:** March 2025
**Duration:** 4-6 weeks
**Dependencies:** Phase 1 completion

### Database Migration
- [ ] Move from in-memory to D1
- [ ] Implement data migration tools
- [ ] Add retention policies (keep 1 year)
- [ ] Performance benchmarking

### User Profiles
- [ ] User profile pages
- [ ] Display user's submitted skills
- [ ] Contribution history
- [ ] Profile customization

### Advanced API Key Management
- [ ] API key generation UI
- [ ] Key usage history/logs
- [ ] Revoke old keys
- [ ] Rate limiting per key
- [ ] Usage analytics dashboard

### Skill History & Trending
- [ ] Skill detail page enhancements
- [ ] Historical accuracy tracking
- [ ] Trend visualization (charts)
- [ ] Model comparison graphs
- [ ] Cost trends over time

### Improved Leaderboard
- [ ] Advanced filtering (date range, model)
- [ ] Search by skill name
- [ ] Filter by source type (local/git/skill.sh)
- [ ] Favorite/bookmark skills
- [ ] User contributions view

### CLI Enhancements
- [ ] Interactive mode (menu navigation)
- [ ] Configuration wizard
- [ ] Result caching/offline mode
- [ ] Bulk benchmark runs
- [ ] Progress indicators (visual progress bars)

### Testing Infrastructure
- [ ] Unit tests for all modules
- [ ] Integration test suite
- [ ] Mock Claude API for testing
- [ ] Test coverage reporting (target: ≥80%)
- [ ] CI/CD pipeline (GitHub Actions)

### Performance Optimization
- [ ] Database query optimization
- [ ] API response caching (KV storage)
- [ ] Leaderboard caching strategy
- [ ] CLI execution parallelization

---

## Phase 3: Advanced Features & Discovery (v0.3)

**Target:** May 2025
**Duration:** 6-8 weeks
**Dependencies:** Phase 2 completion

### Skill Discovery & Search
- [ ] Full-text search across skills
- [ ] Skill tagging system
- [ ] Category classifications
- [ ] Related skills recommendations
- [ ] Search analytics

### Benchmarking Improvements
- [ ] Benchmark scheduling (recurring tests)
- [ ] Batch benchmark runner (test multiple skills)
- [ ] A/B testing framework
- [ ] Model comparison reports
- [ ] Cost optimization suggestions

### Leaderboard Analytics
- [ ] Skill performance trends (monthly)
- [ ] Model ranking comparisons
- [ ] Cost vs. accuracy visualization
- [ ] Benchmark reliability metrics
- [ ] Statistical significance testing

### Community Features
- [ ] Skill reviews/comments
- [ ] Rating system (1-5 stars)
- [ ] Discussion threads per skill
- [ ] Skill recommendations
- [ ] User followers/following

### Integrations
- [ ] GitHub integration (publish from Actions)
- [ ] Slack integration (result notifications)
- [ ] Discord bot (leaderboard queries)
- [ ] Webhook events (new results)

### Public Leaderboard Features
- [ ] Embeddable leaderboard widget
- [ ] Public skill badges
- [ ] Achievement/milestone system
- [ ] Share results on social media
- [ ] Result permalinks

---

## Phase 4: Scale & Polish (v1.0)

**Target:** Q3 2025
**Duration:** Ongoing
**Focus:** Production readiness, stability, performance

### Infrastructure
- [ ] Load testing & optimization
- [ ] Database replication/backup
- [ ] Disaster recovery plan
- [ ] CDN optimization
- [ ] Multi-region deployment

### Security Hardening
- [ ] Penetration testing
- [ ] Rate limiting (DDoS protection)
- [ ] Input validation audit
- [ ] OAuth security review
- [ ] OWASP compliance check

### Operations
- [ ] Monitoring & alerting (Sentry/Datadog)
- [ ] Error tracking & debugging
- [ ] Performance monitoring
- [ ] Uptime monitoring (99.9% target)
- [ ] Automated backups
- [ ] Runbook documentation

### Quality Assurance
- [ ] End-to-end test automation
- [ ] Load testing (1000+ concurrent)
- [ ] Stress testing (capacity limits)
- [ ] Browser compatibility testing
- [ ] Accessibility audit (WCAG 2.1)

### Documentation
- [x] API reference (`docs/api-reference.md`)
- [ ] SDK libraries (JavaScript/Python)
- [ ] Video tutorials
- [ ] Blog posts & case studies
- [ ] FAQ & troubleshooting guide

### Marketing & Adoption
- [ ] Marketing website
- [ ] Product announcements
- [ ] Community outreach
- [ ] Speaking engagements
- [ ] Partnership development

---

## Feature Priority Matrix

### High Priority (Must Have)
- CLI basic functionality ✓ In Progress
- Benchmark execution ✓ In Progress
- Results submission (API)
- Leaderboard display
- Data persistence
- Search functionality

### Medium Priority (Should Have)
- Advanced analytics/charts
- User profiles
- Community features
- Batch operations
- Integrations (GitHub, Slack)

### Low Priority (Nice to Have)
- Mobile app
- Offline mode
- Real-time collaboration
- Skill marketplace
- Premium features

---

## Known Issues & Debt

| Issue | Priority | Status | Target Fix |
|-------|----------|--------|------------|
| Test timeout handling | High | Open | v0.1 |
| Error message clarity | Medium | Open | v0.2 |
| Cache cleanup strategy | Medium | Open | v0.2 |
| Database indexing | High | Open | v0.2 |
| API rate limiting | High | Open | v0.2 |
| Mobile UI responsiveness | Medium | Open | v0.3 |

---

## Resource Allocation

### Team Roles
- **Lead Developer** - Architecture, CLI, API
- **Frontend Engineer** - Leaderboard UI, dashboard
- **DevOps/Infrastructure** - Deployment, monitoring
- **QA/Testing** - Test automation, performance testing
- **Documentation** - Technical docs, tutorials

### Time Estimates

| Phase | Duration | Effort |
|-------|----------|--------|
| v0.1 (MVP) | 6-8 weeks | 200+ hours |
| v0.2 (Persistence) | 4-6 weeks | 150+ hours |
| v0.3 (Advanced) | 6-8 weeks | 200+ hours |
| v1.0 (Polish) | Ongoing | 50+ hours/month |

---

## Dependencies & Blockers

### External Dependencies
- **Claude API** - Core to benchmark execution (Anthropic)
- **Cloudflare Workers** - Webapp hosting platform
- **GitHub API** - OAuth integration
- **pnpm workspaces** - Build infrastructure

### Known Blockers
1. **Claude CLI timeout handling** - May need Anthropic support for longer tests
2. **D1 SQL limits** - Cloudflare D1 query complexity limits
3. **Worker timeout limits** - 30s max CPU time for API requests

---

## Success Metrics & KPIs

### Phase 1 (v0.1)
- CLI usable by power users
- API endpoint responses <500ms
- Documentation >90% complete
- Zero critical bugs in release

### Phase 2 (v0.2)
- 100+ users using CLI
- Leaderboard shows 50+ skills
- User profiles functional
- 80%+ test coverage

### Phase 3 (v0.3)
- 500+ active users/month
- 200+ skills in leaderboard
- Community engagement (comments, ratings)
- 95%+ uptime

### v1.0 (Long-term)
- 5000+ active users/month
- 1000+ skills benchmarked
- Integration with major platforms
- 99.9% uptime SLA

---

## Future Exploration

### Potential Future Features (Post v1.0)

| Feature | Category | Complexity | Interest |
|---------|----------|-----------|----------|
| Skill marketplace | Commerce | High | Medium |
| Real-time collaboration | Social | High | Low |
| Mobile app (iOS/Android) | Platform | Very High | Medium |
| Skill auto-optimization | AI | Very High | High |
| Custom scoring algorithms | Personalization | Medium | Low |
| Benchmark SDK (Python/JS) | Developer Tools | High | High |
| On-premise deployment | Enterprise | High | Low |

### Research Areas
- Machine learning for skill recommendations
- Automated test generation from skill descriptions
- Cost optimization algorithms
- Benchmark reliability metrics (statistical analysis)

---

## Release Schedule

```
Timeline (Estimated)
│
├─ v0.1.0  Feb 2025  ─ MVP launch
│  ├─ v0.1.1 Feb 2025 ─ Bug fixes
│  ├─ v0.1.2 Mar 2025 ─ Stability release
│  └─ v0.1.3 Mar 2025 ─ Performance tune
│
├─ v0.2.0  Mar 2025  ─ Persistence release
│  ├─ v0.2.1 Apr 2025 ─ User features
│  └─ v0.2.2 May 2025 ─ Testing complete
│
├─ v0.3.0  May 2025  ─ Advanced features
│  ├─ v0.3.1 Jun 2025 ─ Analytics release
│  └─ v0.3.2 Jul 2025 ─ Community features
│
└─ v1.0.0  Sep 2025  ─ Stable production release
   ├─ v1.0.1 Oct 2025 ─ Ongoing maintenance
   └─ v1.x   Ongoing ─ Feature releases
```

---

## Change Log

### v0.1.0 (In Progress)
**Features:**
- Initial CLI implementation
- Benchmark execution engine
- GitHub OAuth setup
- Basic leaderboard API
- Static UI (React/Preact)

**Improvements:**
- Graceful degradation for enhanced prompts
- Multi-run aggregation
- Concept accuracy scoring

**Known Issues:**
- Test timeout handling needs work
- Error messages could be clearer
- Performance untested at scale

### Previous Versions
None (new project)

---

**Project Manager:** TBD
**Last Review:** February 2025
**Next Review:** End of February 2025
**Repository:** https://github.com/claudekit/skillmark
