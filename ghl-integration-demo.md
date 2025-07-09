# GHL Integration Demo - Candidate Detail Dialog

## Overview
The GHL (GoHighLevel) candidate update functionality has been successfully integrated into the existing candidate detail dialog. When users edit candidate information and click "Save Changes", the system now automatically:

1. Updates the candidate information in the HireOS database
2. Syncs the updated information to GoHighLevel (if the candidate has a GHL contact ID)
3. Provides real-time feedback about the sync status

## Key Features Implemented

### 1. Automatic GHL Sync on Save
- **Location**: `client/src/components/candidates/candidate-detail-dialog.tsx`
- **Integration Point**: `updateCandidateMutation.onSuccess`
- **Functionality**: After successfully updating candidate in database, automatically syncs to GHL

### 2. Visual Sync Status Indicators
- **GHL Badge**: Shows "GHL Synced" badge in candidate header if candidate has GHL contact ID
- **Loading States**: 
  - "Saving..." during database update
  - "Syncing to GHL..." during GHL sync process
- **Button States**: Save Changes button disabled during sync operations

### 3. Smart Error Handling
- **Graceful Fallback**: If GHL sync fails, candidate is still updated in database
- **User-Friendly Messages**: Clear notifications about sync status
- **Non-Blocking**: GHL sync failures don't prevent candidate updates

### 4. Comprehensive Field Mapping
- **Name Parsing**: Automatically splits full name into firstName/lastName
- **Status Mapping**: Maps HireOS candidate status to GHL workflow tags
- **Job Role Mapping**: Maps job titles to specific GHL role tags
- **Contact Info**: Syncs phone, location, and email information

## Technical Implementation

### Backend Functions
```typescript
// Main sync function
updateCandidateInGHL(candidate) 
  → parseFullName(candidate.name)
  → mapJobTitleToGHLTag(jobTitle)
  → mapStatusToGHLTag(candidate.status)
  → updateGHLContact(ghlContactId, updateData)

// Helper functions
parseFullName("John Doe") → {firstName: "John", lastName: "Doe"}
mapJobTitleToGHLTag("Executive Assistant") → "c–role–ea"
mapStatusToGHLTag("assessment_sent") → "15_assessment_sent"
```

### Frontend Integration
```typescript
// Automatic sync after candidate update
onSuccess: async (updatedCandidate) => {
  // Show success message
  toast({ title: "Candidate updated" });
  
  // Sync to GHL if contact ID exists
  if (updatedCandidate?.ghlContactId) {
    setIsGHLSyncing(true);
    await apiRequest("POST", `/api/ghl-sync/update-candidate/${candidate.id}`);
    setIsGHLSyncing(false);
  }
}
```

## API Endpoints

### Update Candidate in GHL
- **Endpoint**: `POST /api/ghl-sync/update-candidate/:candidateId`
- **Authentication**: Required
- **Validation**: Checks for valid candidate ID and GHL contact ID
- **Response**: Success/failure with detailed logging

## User Experience

### Form Fields That Sync to GHL
- **Full Name** → Split into firstName/lastName
- **Phone** → Direct mapping
- **Location** → Direct mapping
- **Status** → Mapped to GHL workflow tags

### Visual Feedback
1. **Initial State**: Normal "Save Changes" button
2. **Saving**: "Saving..." with spinner
3. **GHL Sync**: "Syncing to GHL..." with spinner
4. **Success**: "Candidate updated" + "GHL sync completed" notifications
5. **Error**: Clear error messages with fallback behavior

### Status Indicators
- **GHL Synced Badge**: Visible in candidate header for synced candidates
- **Real-time Updates**: Button text changes during operations
- **Non-intrusive**: Sync happens automatically without user intervention

## Supported Mappings

### Job Title → GHL Role Tags
- Executive Assistant → c–role–ea
- Audit Senior → c–role–aud–sr
- Other roles → c–role–other

### Status → GHL Workflow Tags
- new → 00_application_submitted
- assessment_sent → 15_assessment_sent
- assessment_completed → 30_assessment_completed
- interview_scheduled → 45_1st_interview_sent
- interview_completed → 60_1st_interview_completed
- second_interview_scheduled → 75_2nd_interview_scheduled
- second_interview_completed → 90_2nd_interview_completed
- talent_pool → 95_talent_pool
- rejected → 99_rejected
- offer_sent → 85_offer_sent
- hired → 100_hired

## Testing

### Test Scripts Created
- `test-update-function.js` - Tests core GHL update functionality
- `test-ghl-fresh-contacts.js` - Tests GHL API connectivity
- `demo-ghl-candidate-update.js` - Comprehensive demo and documentation

### Integration Testing
- Form submission triggers database update
- Successful database update triggers GHL sync
- Visual feedback updates correctly
- Error handling works as expected

## Benefits

1. **Seamless Integration**: No additional user actions required
2. **Real-time Sync**: Immediate synchronization with GHL
3. **Robust Error Handling**: Graceful fallbacks and clear messaging
4. **Visual Feedback**: Users always know what's happening
5. **Automatic Mapping**: Intelligent field and status mapping
6. **Non-blocking**: GHL issues don't prevent candidate updates

## Future Enhancements

1. **Batch Sync**: Sync multiple candidates at once
2. **Conflict Resolution**: Handle GHL vs HireOS data conflicts
3. **Sync History**: Track sync operations and outcomes
4. **Custom Mappings**: Allow users to customize field mappings
5. **Webhooks**: Real-time updates from GHL back to HireOS

The integration is now complete and ready for production use!