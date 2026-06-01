# Probe Matrix Workspace

Store the concrete post-fix probe table here before or during the scan.

Expected artifacts:

- local probe command list
- production-safe probe command list, if explicitly requested
- expected status codes
- observed status codes
- notes for probes skipped because they would require real credentials or writes

Do not store response bodies that may contain secrets or user data.
