# ⚠️ CRITICAL: Test Suite Configuration

## IMPORTANT WARNING

**DO NOT RUN TESTS AGAINST PRODUCTION DATABASE!**

The test suite in this directory is currently configured to run against the **LIVE PRODUCTION WEBSITE**:
- URL: `https://vidmajayani.github.io/universitycomplaintsystem/`
- Database: Production Supabase instance

## What Happened

The delete complaint test (`test_delete.py`) was **automatically deleting real complaints** from the production database with the message:
> "This complaint is a duplicate and needs to be removed from the system."

## Current Status

✅ **FIXED**: The delete test has been **DISABLED** to prevent further automatic deletions.

The test `test_delete_complaint_with_required_fields` now has a `@pytest.mark.skip` decorator and will not run.

## How to Run Tests Safely

### Option 1: Skip Delete Tests (Current Setup)
The delete test is now skipped by default. You can run other tests safely:

```bash
pytest tests/test_cases/ -v
```

### Option 2: Run Only Specific Safe Tests
Run tests that don't modify data:

```bash
# Run only login tests
pytest tests/test_cases/test_login.py -v

# Run only search tests  
pytest tests/test_cases/test_search.py -v

# Run only filter tests
pytest tests/test_cases/test_filter.py -v
```

### Option 3: Set Up Separate Test Environment (RECOMMENDED)

1. Create a new Supabase project for testing
2. Update `tests/configurations/config.ini` with test URLs
3. Re-enable the delete test for the test environment only

## Files Modified

- `tests/test_cases/test_delete.py` - Delete test disabled with `@pytest.mark.skip`
- `tests/IMPORTANT_README.md` - This warning file created

## Need Help?

If you need to:
- Set up a separate test environment
- Re-enable tests for testing purposes
- Understand the test configuration

Please review the configuration in `tests/configurations/config.ini` and ensure you're not pointing to production URLs.

---

**Last Updated**: 2025-12-22  
**Reason**: Prevented automatic deletion of production complaints
