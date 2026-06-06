# Group membership is an explicit stored list, not a rule

When making group-monitor member selection searchable (#694), the requester also proposed dynamic membership by tag pattern (e.g. `site1-*` auto-adds matching monitors). We decided group membership stays an explicit, stored list of members. Dynamic membership contradicts the group model: each member carries an explicit weight (weights must sum to 1) and a manual execution order — a rule that adds/removes members over time would need an auto-weighting policy, silent weight redistribution when monitors are created or deleted, and an undefined execution order for matched members. Bulk needs are served in the editor instead: search plus "Add all N matching" makes large explicit groups cheap to build.

If wildcard groups are requested again, the answer is here: it's a different feature (a rule-based aggregate without weights or order), not an extension of Group Monitors.
