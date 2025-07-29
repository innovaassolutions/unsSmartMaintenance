# UNS Demo System - Claude Code Instructions

## Agent OS Documentation

### Product Context

- **Mission & Vision:** @.agent-os/product/mission.md
- **Technical Architecture:** @.agent-os/product/tech-stack.md
- **Development Roadmap:** @.agent-os/product/roadmap.md
- **Decision History:** @.agent-os/product/decisions.md

### Development Standards

- **Code Style:** @~/.agent-os/standards/code-style.md
- **Best Practices:** @~/.agent-os/standards/best-practices.md

### Project Management

- **Active Specs:** @.agent-os/specs/
- **Spec Planning:** Use `@~/.agent-os/instructions/create-spec.md`
- **Tasks Execution:** Use `@~/.agent-os/instructions/execute-tasks.md`

## Workflow Instructions

When asked to work on this codebase:

1. **First**, check @.agent-os/product/roadmap.md for current priorities
2. **Then**, follow the appropriate instruction file:
   - For new features: @.agent-os/instructions/create-spec.md
   - For tasks execution: @.agent-os/instructions/execute-tasks.md
3. **Always**, adhere to the standards in the files listed above

## Important Notes

- Product-specific files in `.agent-os/product/` override any global standards
- User's specific instructions override (or amend) instructions found in `.agent-os/specs/...`
- Always adhere to established patterns, code style, and best practices documented above.

## Current Project Status

**Phase 1 Progress: 95% Complete**
- ✅ Complete UNS topic hierarchy system with ISA-95 compliance
- ✅ EMQX Cloud integration with automated provisioning  
- ✅ Comprehensive API endpoints for topic and machine management
- ✅ CNC machine data generator system (10 realistic machines)
- ✅ Sensor simulation with operational state management
- 🔄 **Next Priority**: MQTT to Supabase data pipeline (final Phase 1 task)

**Ready for Phase 2**: Dashboard development can begin once data pipeline is complete.
