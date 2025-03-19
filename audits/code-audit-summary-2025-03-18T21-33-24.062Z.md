# Code Audit Summary

Audit date: 2025-03-18T21:33:24.063Z

## Overview

- Total files analyzed: 76
- Files with legacy field references: 30
- Total legacy field references: 256

## Legacy Field Counts

- `userID` → `username`: 74 references
- `userId` → `firebaseUid`: 139 references
- `userName` → `name`: 43 references

## Files Requiring Updates

### src/services/firebase.ts (37 references)

#### `userID` → `username` (14 occurrences)

- Line 55: `async getUserAnswers(userID: string, lastVisible: any = null) {`
- Line 59: `where('answers', 'array-contains', { userID }),`
- Line 94: `async getUserPosts(userID: string) {`
- Line 97: `console.log(`[getUserPosts] Starting to fetch posts for user ${userID}`);`
- Line 110: `where('userId', '==', userID),`
- ... and 9 more

#### `userId` → `firebaseUid` (22 occurrences)

- Line 110: `where('userId', '==', userID),`
- Line 127: `console.error(`[getUserPosts] Error in standardized userId query:`, err);`
- Line 203: `.map(answer => answer.userId)`
- Line 239: `const updatedAnswerUserIds = existingAnswerUserIds.includes(answer.userId)`
- Line 241: `: [...existingAnswerUserIds, answer.userId];`
- ... and 17 more

#### `userName` → `name` (1 occurrences)

- Line 323: `hasUserName: !!firstAnswer.userName,`

### src/utils/userIdHelpers.ts (22 references)

#### `userId` → `firebaseUid` (8 occurrences)

- Line 15: `if (normalizedPost.userId && !normalizedPost.firebaseUid) {`
- Line 16: `normalizedPost.firebaseUid = normalizedPost.userId;`
- Line 17: `} else if (normalizedPost.firebaseUid && !normalizedPost.userId) {`
- Line 18: `normalizedPost.userId = normalizedPost.firebaseUid;`
- Line 49: `if (normalizedAnswer.userId && !normalizedAnswer.firebaseUid) {`
- ... and 3 more

#### `userName` → `name` (10 occurrences)

- Line 21: `if (normalizedPost.userName && !normalizedPost.username) {`
- Line 22: `normalizedPost.username = normalizedPost.userName;`
- Line 23: `normalizedPost.name = normalizedPost.userName;`
- Line 24: `} else if (normalizedPost.username && !normalizedPost.userName) {`
- Line 25: `normalizedPost.userName = normalizedPost.username;`
- ... and 5 more

#### `userID` → `username` (4 occurrences)

- Line 71: `if (normalizedProfile.userID && !normalizedProfile.username) {`
- Line 72: `normalizedProfile.username = normalizedProfile.userID;`
- Line 73: `} else if (normalizedProfile.username && !normalizedProfile.userID) {`
- Line 74: `normalizedProfile.userID = normalizedProfile.username;`

### src/app/api/debug/user/[id]/posts/route.ts (19 references)

#### `userId` → `firebaseUid` (13 occurrences)

- Line 9: `userId?: string;`
- Line 16: `userId?: string;`
- Line 31: `const userId = id;`
- Line 33: `if (!userId) {`
- Line 40: `console.log(`[API] Fetching posts for user: ${userId}`);`
- ... and 8 more

#### `userName` → `name` (6 occurrences)

- Line 11: `userName?: string;`
- Line 18: `userName?: string;`
- Line 67: `post.userName === username`
- Line 73: `post.userName === username`
- Line 82: `a.userName === username`
- ... and 1 more

### src/utils/dataNormalization.ts (16 references)

#### `userID` → `username` (5 occurrences)

- Line 25: `if (data.userID && !data.userId) {`
- Line 26: `normalized.userId = data.userID;`
- Line 127: `userID: 0,`
- Line 157: `if (data.userID) fieldCounts.userID++;`
- Line 157: `if (data.userID) fieldCounts.userID++;`

#### `userId` → `firebaseUid` (11 occurrences)

- Line 25: `if (data.userID && !data.userId) {`
- Line 26: `normalized.userId = data.userID;`
- Line 27: `} else if (data.userid && !data.userId) {`
- Line 28: `normalized.userId = data.userid;`
- Line 29: `} else if (data.user_id && !data.userId) {`
- ... and 6 more

### src/scripts/migrateUserIds.ts (15 references)

#### `userID` → `username` (4 occurrences)

- Line 29: `const username = userData.userID || userData.userId || userData.username || `user_${firebaseUid.substring(0, 8)}`;`
- Line 45: `const username = uidToUsernameMap.get(firebaseUid) || userData.userID || userData.userId || `user_${firebaseUid.substring(0, 8)}`;`
- Line 62: `if (userData.userID !== undefined) {`
- Line 63: `updates.userID = null; // This will be removed in Firestore`

#### `userId` → `firebaseUid` (9 occurrences)

- Line 29: `const username = userData.userID || userData.userId || userData.username || `user_${firebaseUid.substring(0, 8)}`;`
- Line 45: `const username = uidToUsernameMap.get(firebaseUid) || userData.userID || userData.userId || `user_${firebaseUid.substring(0, 8)}`;`
- Line 66: `if (userData.userId !== undefined && userData.userId !== firebaseUid) {`
- Line 66: `if (userData.userId !== undefined && userData.userId !== firebaseUid) {`
- Line 67: `updates.userId = null; // This will be removed in Firestore`
- ... and 4 more

#### `userName` → `name` (2 occurrences)

- Line 105: `updates.name = postData.userName || username;`
- Line 123: `name: answer.userName || username,`

### src/scripts/runMigration.js (15 references)

#### `userID` → `username` (4 occurrences)

- Line 49: `const username = userData.userID || userData.userId || userData.username || `user_${firebaseUid.substring(0, 8)}`;`
- Line 65: `const username = uidToUsernameMap.get(firebaseUid) || userData.userID || userData.userId || `user_${firebaseUid.substring(0, 8)}`;`
- Line 82: `if (userData.userID !== undefined) {`
- Line 83: `updates.userID = null; // This will be removed in Firestore`

#### `userId` → `firebaseUid` (9 occurrences)

- Line 49: `const username = userData.userID || userData.userId || userData.username || `user_${firebaseUid.substring(0, 8)}`;`
- Line 65: `const username = uidToUsernameMap.get(firebaseUid) || userData.userID || userData.userId || `user_${firebaseUid.substring(0, 8)}`;`
- Line 86: `if (userData.userId !== undefined && userData.userId !== firebaseUid) {`
- Line 86: `if (userData.userId !== undefined && userData.userId !== firebaseUid) {`
- Line 87: `updates.userId = null; // This will be removed in Firestore`
- ... and 4 more

#### `userName` → `name` (2 occurrences)

- Line 125: `updates.name = postData.userName || username;`
- Line 143: `name: answer.userName || username,`

### src/scripts/testMigration.js (13 references)

#### `userID` → `username` (2 occurrences)

- Line 41: `const username = userData.userID || userData.username || `user_${firebaseUid.substring(0, 8)}`;`
- Line 72: `const username = uidToUsernameMap.get(firebaseUid) || userData.userID || `user_${firebaseUid.substring(0, 8)}`;`

#### `userId` → `firebaseUid` (6 occurrences)

- Line 113: `userId: postData.userId,`
- Line 113: `userId: postData.userId,`
- Line 122: `if (postData.userId) {`
- Line 123: `const firebaseUid = postData.userId;`
- Line 144: `userId: postData.userId,`
- ... and 1 more

#### `userName` → `name` (5 occurrences)

- Line 114: `userName: postData.userName,`
- Line 114: `userName: postData.userName,`
- Line 128: `updates.name = postData.userName || username;`
- Line 145: `userName: postData.userName,`
- Line 145: `userName: postData.userName,`

### src/app/profile/[userID]/page.tsx (12 references)

#### `userID` → `username` (12 occurrences)

- Line 15: `params: { userID: string };`
- Line 29: `function ProfileContent({ userID }: { userID: string }) {`
- Line 29: `function ProfileContent({ userID }: { userID: string }) {`
- Line 40: `queryKey: ['user', userID],`
- Line 41: `queryFn: () => UserService.getUserProfile(userID),`
- ... and 7 more

### src/hooks/usePosts.ts (12 references)

#### `userId` → `firebaseUid` (12 occurrences)

- Line 7: `userId?: string;`
- Line 19: `export function usePosts({ userId, username, firebaseUid, totemName, pageSize = 10 }: UsePostsOptions = {}) {`
- Line 23: `console.log(`[usePosts] Fetching posts with params:`, { userId, username, firebaseUid, totemName, pageSize, pageParam });`
- Line 37: `} else if (userId) {`
- Line 39: `console.log(`[usePosts] Fetching posts for legacy userId: ${userId}`);`
- ... and 7 more

### src/utils/dataTransform.ts (9 references)

#### `userId` → `firebaseUid` (5 occurrences)

- Line 56: `userId: answer.userId || '',`
- Line 56: `userId: answer.userId || '',`
- Line 82: `.map(answer => answer.userId)`
- Line 88: `userId: data.userId || '',`
- Line 88: `userId: data.userId || '',`

#### `userName` → `name` (4 occurrences)

- Line 57: `userName: answer.userName || 'Anonymous',`
- Line 57: `userName: answer.userName || 'Anonymous',`
- Line 89: `userName: data.userName || 'Anonymous',`
- Line 89: `userName: data.userName || 'Anonymous',`

### src/app/api/debug/hooks/usePosts/route.ts (8 references)

#### `userId` → `firebaseUid` (8 occurrences)

- Line 7: `const userId = searchParams.get('userId');`
- Line 7: `const userId = searchParams.get('userId');`
- Line 10: `if (!userId && !totemName) {`
- Line 12: `{ error: 'Either userId or totemName must be provided' },`
- Line 19: `if (userId) {`
- ... and 3 more

### src/services/PostService.ts (8 references)

#### `userID` → `username` (6 occurrences)

- Line 6: `static async fetchUserPosts(userID: string, pageSize = 10, lastDoc?: any): Promise<{ items: Post[]; lastDoc: any }> {`
- Line 11: `where('authorId', '==', userID),`
- Line 77: `static async getUserAnswers(userID: string, pageSize = 10, lastDoc?: any): Promise<{ items: Post[]; lastDoc: any }> {`
- Line 82: `where(`answers.${userID}`, '!=', null),`
- Line 94: `const aAnswer = (a.answers || []).find(ans => ans.userId === userID);`
- ... and 1 more

#### `userId` → `firebaseUid` (2 occurrences)

- Line 94: `const aAnswer = (a.answers || []).find(ans => ans.userId === userID);`
- Line 95: `const bAnswer = (b.answers || []).find(ans => ans.userId === userID);`

### src/app/api/debug/user/[id]/profile/route.ts (7 references)

#### `userId` → `firebaseUid` (7 occurrences)

- Line 12: `const userId = id;`
- Line 14: `if (!userId) {`
- Line 21: `console.log(`[API] Fetching profile for user: ${userId}`);`
- Line 24: `let profile = await AppUserService.getUserByFirebaseUid(userId);`
- Line 28: `profile = await AppUserService.getUserByUsername(userId);`
- ... and 2 more

### src/components/common/FollowButton.tsx (7 references)

#### `userID` → `username` (3 occurrences)

- Line 27: `if (!profile || profile.userID === targetUserId) {`
- Line 55: `userID: userId,`
- Line 56: `name: isTarget ? targetUserId : userId, // Use userID as name if not available`

#### `userId` → `firebaseUid` (4 occurrences)

- Line 48: `const ensureUserExists = async (userId: string, isTarget: boolean = false) => {`
- Line 49: `const userRef = doc(db, 'users', userId);`
- Line 55: `userID: userId,`
- Line 56: `name: isTarget ? targetUserId : userId, // Use userID as name if not available`

### src/services/totem.ts (7 references)

#### `userId` → `firebaseUid` (7 occurrences)

- Line 36: `userId: string`
- Line 45: `console.log('TotemService.handleTotemLike - userId:', userId);`
- Line 45: `console.log('TotemService.handleTotemLike - userId:', userId);`
- Line 54: `if (totem.likedBy.includes(userId)) {`
- Line 60: `const updatedAnswers = this.updateTotemStats(post.answers, answerIdx, totemName, userId, now);`
- ... and 2 more

### src/types/models.ts (7 references)

#### `userID` → `username` (1 occurrences)

- Line 59: `userID?: string;`

#### `userId` → `firebaseUid` (3 occurrences)

- Line 60: `userId?: string;`
- Line 73: `userId?: string;`
- Line 90: `userId?: string;`

#### `userName` → `name` (3 occurrences)

- Line 61: `userName?: string;`
- Line 74: `userName?: string;`
- Line 91: `userName?: string;`

### src/hooks/useUser.ts (6 references)

#### `userID` → `username` (6 occurrences)

- Line 55: `else if (updates.userID && updates.userID !== profile.userID) {`
- Line 55: `else if (updates.userID && updates.userID !== profile.userID) {`
- Line 55: `else if (updates.userID && updates.userID !== profile.userID) {`
- Line 56: `const validation = await UserService.validateUsername(updates.userID, profile.userID);`
- Line 56: `const validation = await UserService.validateUsername(updates.userID, profile.userID);`
- ... and 1 more

### src/scripts/codeAudit.js (6 references)

#### `userID` → `username` (2 occurrences)

- Line 14: `'userID',`
- Line 22: `'userID': 'username',`

#### `userId` → `firebaseUid` (2 occurrences)

- Line 15: `'userId',`
- Line 23: `'userId': 'firebaseUid',`

#### `userName` → `name` (2 occurrences)

- Line 16: `'userName',`
- Line 24: `'userName': 'name',`

### src/app/profile/page.tsx (5 references)

#### `userID` → `username` (4 occurrences)

- Line 36: `userId: profile?.userID, // For backward compatibility`
- Line 48: `username: profile?.username || profile?.userID || '',`
- Line 59: `username: profile.username || profile.userID || '',`
- Line 179: `<p className="text-gray-600">@{profile.username || profile.userID}</p>`

#### `userId` → `firebaseUid` (1 occurrences)

- Line 36: `userId: profile?.userID, // For backward compatibility`

### src/app/page.tsx (4 references)

#### `userId` → `firebaseUid` (2 occurrences)

- Line 44: `followedUsers.includes(answer.userId || '') // For backward compatibility`
- Line 154: `firebaseUid: data.firebaseUid || data.userId || '',`

#### `userName` → `name` (2 occurrences)

- Line 155: `username: data.username || data.userName || '',`
- Line 156: `name: data.name || data.userName || '',`

### src/app/post/[id]/page.tsx (4 references)

#### `userId` → `firebaseUid` (1 occurrences)

- Line 44: `userId: string;`

#### `userName` → `name` (2 occurrences)

- Line 49: `userName: string;`
- Line 150: `{post.answers.length} {post.answers.length === 1 ? 'answer' : 'answers'} • Posted {formatDistanceToNow(post.createdAt, { addSuffix: true })} by {post.userName || 'Anonymous'}`

#### `userID` → `username` (1 occurrences)

- Line 50: `userID: string;`

### src/services/userService.ts (4 references)

#### `userID` → `username` (4 occurrences)

- Line 13: `if (userData.userID && !userData.username) {`
- Line 14: `userData.username = userData.userID;`
- Line 114: `const legacyQuery = query(usersRef, where('userID', '==', username.toLowerCase()));`
- Line 137: `q = query(usersRef, where('userID', '==', username.toLowerCase()));`

### src/components/questions/QuestionList.tsx (3 references)

#### `userName` → `name` (3 occurrences)

- Line 118: `{formatDistanceToNow(answer.createdAt, { addSuffix: true })} by {answer.userName || 'Anonymous'}`
- Line 196: `{formatDistanceToNow(answer.createdAt, { addSuffix: true })} by {answer.userName || 'Anonymous'}`
- Line 269: `{formatDistanceToNow(toDate(post.createdAt), { addSuffix: true })} by {post.userName || 'Anonymous'}`

### src/utils/totem.ts (3 references)

#### `userId` → `firebaseUid` (3 occurrences)

- Line 32: `userId: string`
- Line 35: `const updatedAnswers = await TotemService.updateTotemStats(post.answers, answerIdx, totemName, userId, timestamp);`
- Line 48: `const updatedAnswers = await TotemService.updateTotemStats(post.answers, answerIdx, totemName, post.answers[answerIdx].userId, timestamp);`

### src/app/debug/profile-test/page.tsx (2 references)

#### `userId` → `firebaseUid` (2 occurrences)

- Line 9: `const [userId, setUserId] = useState<string>('');`
- Line 119: `{userId && (`

### src/app/api/admin/data-normalization/audit/route.ts (1 references)

#### `userID` → `username` (1 occurrences)

- Line 21: `auditResults.userID +`

### src/components/auth/SignupForm.tsx (1 references)

#### `userID` → `username` (1 occurrences)

- Line 32: `userID: user.uid,`

### src/components/totem/TotemDetail.tsx (1 references)

#### `userName` → `name` (1 occurrences)

- Line 171: `{formatDistanceToNow(answer.createdAt, { addSuffix: true })} by {answer.userName || 'Anonymous'}`

### src/scripts/createIndexes.ts (1 references)

#### `userId` → `firebaseUid` (1 occurrences)

- Line 46: `{ fieldPath: 'userId', order: 'ASCENDING' },`

### src/scripts/migrateAnswerUserIds.ts (1 references)

#### `userId` → `firebaseUid` (1 occurrences)

- Line 41: `.map(answer => answer.userId)`

