/**
 * Demo: HireOS to GHL Candidate Update Function
 * 
 * This script demonstrates how to use the updateCandidateInGHL function
 * to sync candidate details from HireOS to GoHighLevel.
 * 
 * The function automatically:
 * - Parses candidate name into first/last name
 * - Maps job title to GHL role tag (c–role–ea, c–role–aud–sr, etc.)
 * - Maps candidate status to GHL status tag (15_assessment_sent, etc.)
 * - Updates contact in GHL with proper tags
 */

import { updateCandidateInGHL, mapJobTitleToGHLTag, mapStatusToGHLTag, parseFullName } from './server/ghl-integration.ts';

console.log('📚 HireOS to GHL Candidate Update Demo\n');

// Demo: Helper Functions
console.log('🔧 Helper Functions:');
console.log('===================');

// Name parsing
const testName = 'John Michael Doe';
const { firstName, lastName } = parseFullName(testName);
console.log(`parseFullName("${testName}") →`);
console.log(`  firstName: "${firstName}"`);
console.log(`  lastName: "${lastName}"`);

// Job title mapping
const jobTitles = ['Executive Assistant', 'Audit Senior', 'Software Engineer'];
console.log('\nJob Title to GHL Tag Mapping:');
jobTitles.forEach(title => {
  const tag = mapJobTitleToGHLTag(title);
  console.log(`  "${title}" → "${tag}"`);
});

// Status mapping
const statuses = ['new', 'assessment_sent', 'interview_scheduled', 'hired'];
console.log('\nStatus to GHL Tag Mapping:');
statuses.forEach(status => {
  const tag = mapStatusToGHLTag(status);
  console.log(`  "${status}" → "${tag}"`);
});

// Demo: Complete Update Function
console.log('\n📊 Complete Update Function Example:');
console.log('====================================');

const exampleCandidate = {
  id: 123,
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  phone: '+1987654321',
  location: 'San Francisco, CA',
  status: 'assessment_sent',
  ghlContactId: 'valid-ghl-contact-id-here',
  job: {
    title: 'Executive Assistant',
    suggestedTitle: 'Executive Assistant'
  }
};

console.log('Example candidate data:');
console.log(JSON.stringify(exampleCandidate, null, 2));

console.log('\nTo update this candidate in GHL:');
console.log('```javascript');
console.log('const result = await updateCandidateInGHL(candidate);');
console.log('```');

console.log('\nThis will:');
console.log('1. Parse "Jane Smith" → firstName: "Jane", lastName: "Smith"');
console.log('2. Map job title "Executive Assistant" → "c–role–ea"');
console.log('3. Map status "assessment_sent" → "15_assessment_sent"');
console.log('4. Update GHL contact with tags: ["c–role–ea", "15_assessment_sent"]');

console.log('\n🌐 API Endpoint Usage:');
console.log('=====================');
console.log('POST /api/ghl-sync/update-candidate/:candidateId');
console.log('Requires authentication');
console.log('');
console.log('Example with curl:');
console.log('curl -X POST http://localhost:5000/api/ghl-sync/update-candidate/123 \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -H "Cookie: your-session-cookie" \\');
console.log('  -d "{}"');

console.log('\n✅ Function Features:');
console.log('====================');
console.log('• Validates candidate has GHL contact ID');
console.log('• Automatically parses full name into first/last name');
console.log('• Maps job titles to specific GHL role tags');
console.log('• Maps candidate status to workflow status tags');
console.log('• Updates phone, location, and tags in GHL');
console.log('• Provides detailed success/error logging');
console.log('• Handles API errors gracefully');

console.log('\n🎯 Supported Role Tags:');
console.log('======================');
console.log('• Executive Assistant → c–role–ea');
console.log('• Audit Senior → c–role–aud–sr');
console.log('• Other roles → c–role–other');

console.log('\n🏷️ Supported Status Tags:');
console.log('=========================');
console.log('• new → 00_application_submitted');
console.log('• assessment_sent → 15_assessment_sent');
console.log('• assessment_completed → 30_assessment_completed');
console.log('• interview_scheduled → 45_1st_interview_sent');
console.log('• interview_completed → 60_1st_interview_completed');
console.log('• second_interview_scheduled → 75_2nd_interview_scheduled');
console.log('• second_interview_completed → 90_2nd_interview_completed');
console.log('• talent_pool → 95_talent_pool');
console.log('• rejected → 99_rejected');
console.log('• offer_sent → 85_offer_sent');
console.log('• hired → 100_hired');

console.log('\n🔄 Usage in Application:');
console.log('========================');
console.log('1. Import the function:');
console.log('   import { updateCandidateInGHL } from "./server/ghl-integration"');
console.log('');
console.log('2. Get candidate from database:');
console.log('   const candidate = await storage.getCandidate(candidateId)');
console.log('');
console.log('3. Ensure candidate has job data:');
console.log('   if (candidate.jobId) {');
console.log('     const job = await storage.getJob(candidate.jobId)');
console.log('     candidate.job = job');
console.log('   }');
console.log('');
console.log('4. Update in GHL:');
console.log('   const result = await updateCandidateInGHL(candidate)');

console.log('\n✅ Demo completed! Function is ready for use.');