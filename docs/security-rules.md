# Shrug Database Security Rules

This document outlines the security rules implemented in the Shrug application to protect data integrity, ensure proper access controls, and prepare for future features.

## Overview

The security rules in `firestore.rules` are designed to:

1. Protect user data from unauthorized access
2. Ensure data integrity through validation
3. Implement proper permission controls based on user roles
4. Support the application's feature set and future roadmap

## Rule Structure

The rules are organized into the following sections:

1. **Helper Functions**: Reusable validation functions
2. **Current Collections**: Rules for existing collections (users, posts, totems)
3. **Future Collections**: Rules for planned collections (userActivities, userCollections)

## Helper Functions

Helper functions provide reusable validation logic across different rules:

### Authentication Helpers

- `isAuthenticated()`: Checks if the user is signed in
- `isEmailVerified()`: Checks if the user's email is verified
- `isOwner(userId)`: Verifies the current user is the specified user
- `isResourceOwner()`: Checks if the current user owns the resource
- `hasValidOwnerFields()`: Validates owner fields during creation

### User Role/Status Helpers

- `isPremiumUser()`: Checks if the user has a premium membership
- `isBasicUser()`: Checks if the user has at least basic membership
- `existsUser()`: Verifies the user document exists

### Data Validation Helpers

- `hasValidTimestamps()`: Validates timestamp fields on document creation
- `hasValidUpdateTimestamps()`: Validates timestamp fields on document updates

## Collection Rules

### Users Collection

- **Read**: Any authenticated user can read profiles
- **Create**: Users can only create their own profiles
- **Update**: 
  - Users can update most fields in their own profiles
  - Restricted fields like `membershipTier` cannot be directly updated
  - Following/followers arrays can be updated by other users
- **Delete**: Not allowed through direct client operations

### Posts Collection

- **Read**: Any authenticated user can read posts
- **Create**: Requires email verification and proper owner fields
- **Update**:
  - Post owners can update most content fields
  - Anyone can update answers and engagement metrics
  - Anyone can update totem associations
- **Delete**: Only post owners can delete their posts

### Totems Collection

- **Read**: Any authenticated user can read totems
- **Create**: Requires email verification
- **Update**:
  - Anyone can update usage stats and like information
  - Anyone can update relationships
- **Delete**: Not allowed through direct client operations

### Future Collections

#### User Activities (Planned)

- **Read**: Users can only read their own activity data
- **Write**: Not allowed through direct client operations (will be handled by server functions)

#### User Collections (Planned)

- **Read**: 
  - Users can read their own collections
  - Public collections can be read by any authenticated user
- **Create/Update/Delete**: Users can only manage their own collections

## Testing

The security rules are thoroughly tested using the Firebase Rules Unit Testing framework. The test suite in `src/tests/security-rules.test.ts` verifies all permissions and validations.

### Running the Tests

To run the security rules tests:

```bash
npm run test:rules
```

This command will:
1. Start the Firebase emulators
2. Execute the test suite against the emulated Firestore
3. Clean up after the tests complete

### Test Coverage

The test suite covers:

- User profile operations (read, create, update, restricted field protection)
- Post operations (create, read, update, authorization checks)
- Totem operations (like/unlike, relationship updates)
- Planned collections for future features

## Security Principles

These rules implement several key security principles:

1. **Least Privilege**: Users have only the permissions they need
2. **Data Validation**: All inputs are validated before writing to the database
3. **Ownership Verification**: Actions on resources are restricted to their owners
4. **Role-Based Access**: Certain operations require specific user roles
5. **Temporal Validation**: Timestamp validation prevents manipulation

## Extending the Rules

When adding new collections or features:

1. Add helper functions for reusable validation logic
2. Include both read and write rules for all collections
3. Consider all edge cases and potential security vulnerabilities
4. Add tests for new rules before deploying
5. Document the changes in this file

## Performance Considerations

Security rules can impact performance if not designed carefully:

- Rules use `get()` operations sparingly to reduce latency
- Complex validation is structured to fail fast when possible
- Collection-level rules are preferred over document-level where appropriate

## Maintenance

The security rules should be reviewed and updated:

- When adding new features or collections
- After significant data model changes
- When implementing new authentication methods
- Periodically as part of security audits 