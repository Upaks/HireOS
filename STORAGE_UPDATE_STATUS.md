# Storage Layer Update Status

## ✅ Completed

1. ✅ Updated imports - Added `accounts` and `accountMembers`
2. ✅ Updated IStorage interface - Added account methods and updated all method signatures
3. ✅ Added account helper methods:
   - `getUserAccountId(userId)` - Gets user's account ID
   - `createAccount(name, userId, role)` - Creates account and adds user as member
   - `getAccountMembers(accountId)` - Gets all members of an account
4. ✅ Updated `getAllUsers()` - Now accepts optional accountId parameter
5. ✅ Updated Job operations:
   - `createJob()` - Now requires accountId
   - `getJob()` - Now requires accountId and filters by it
   - `getJobs()` - Now requires accountId and filters by it
   - `updateJob()` - Now requires accountId and filters by it
6. ✅ Updated Job Platform operations:
   - `createJobPlatform()` - Now requires accountId
   - `getJobPlatforms()` - Now requires accountId and filters by it

## 🔄 Still Need to Update

The following methods in `server/storage.ts` still need account_id filtering:

### Form Templates
- `getFormTemplates()` → `getFormTemplates(accountId)`
- `getFormTemplate()` → `getFormTemplate(id, accountId)`
- `getDefaultFormTemplate()` → `getDefaultFormTemplate(accountId)`
- `createFormTemplate()` → `createFormTemplate(template & { accountId })`
- `updateFormTemplate()` → `updateFormTemplate(id, accountId, data)`
- `deleteFormTemplate()` → `deleteFormTemplate(id, accountId)`

### Candidates
- `createCandidate()` → `createCandidate(candidate & { accountId })`
- `getCandidate()` → `getCandidate(id, accountId)`
- `getCandidates()` → `getCandidates(accountId, filters)`
- `updateCandidate()` → `updateCandidate(id, accountId, data)`
- `getCandidateByNameAndEmail()` → `getCandidateByNameAndEmail(name, email, accountId)`
- `getCandidateByGHLContactId()` → `getCandidateByGHLContactId(ghlContactId, accountId)`

### Interviews
- `createInterview()` → `createInterview(interview & { accountId })`
- `getInterview()` → `getInterview(id, accountId)`
- `getInterviews()` → `getInterviews(accountId, filters)`
- `updateInterview()` → `updateInterview(id, accountId, data)`
- `deleteInterview()` → `deleteInterview(id, accountId)`

### Evaluations
- `createEvaluation()` → `createEvaluation(evaluation & { accountId })`
- `getEvaluationByInterview()` → `getEvaluationByInterview(interviewId, accountId)`
- `updateEvaluation()` → `updateEvaluation(id, accountId, data)`

### Offers
- `createOffer()` → `createOffer(offer & { accountId })`
- `getOfferByCandidate()` → `getOfferByCandidate(candidateId, accountId)`
- `updateOffer()` → `updateOffer(id, accountId, data)`
- `getOfferByToken()` - No change needed (token is unique)

### Comments
- `createComment()` → `createComment(comment & { accountId })`
- `getComments()` → `getComments(entityType, entityId, accountId)`
- `deleteComment()` → `deleteComment(id, userId, accountId)`
- `getUsersForMentionAutocomplete()` → `getUsersForMentionAutocomplete(accountId, query?)`

### Activity Logs
- `createActivityLog()` → `createActivityLog(log & { accountId })`

### Platform Integrations
- Some methods may need account filtering (check current implementation)

### In-App Notifications
- May need account filtering (check current implementation)

## 📝 Notes

- Interface is already updated (all signatures changed)
- Implementation methods need to be updated to match interface
- Each method needs:
  1. Add accountId parameter
  2. Add WHERE clause filtering by accountId
  3. Set accountId on INSERT operations

## Next Steps

Option 1: Continue updating all methods now (will take significant time)
Option 2: Test current changes, then continue incrementally
Option 3: Provide detailed update script for remaining methods

