# Encryption Key Management Guide

## Current Implementation
- **Encryption Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Storage**: Environment variable (`ENCRYPTION_KEY`)
- **Key Format**: 64 hex characters (32 bytes)

## Security Model

### How It Works
1. **Encryption**: Data is encrypted before being stored in the database
2. **Decryption**: Data is decrypted when retrieved from the database
3. **Key Access**: The encryption key is required to decrypt data

### Threat Model
✅ **Protects Against:**
- Database breaches where attacker doesn't have the key
- Unauthorized database access (if key is stored separately)
- Database backups being compromised
- Database administrators accessing sensitive data

❌ **Does NOT Protect Against:**
- Attacker who has both the database AND the encryption key
- Application-level vulnerabilities that expose the key
- Compromised application server with environment variable access

## Best Practices for Key Management

### 1. **Use a Key Management Service (KMS)** ⭐ RECOMMENDED

Instead of storing the key in environment variables, use a dedicated key management service:

#### Option A: AWS KMS (if using AWS)
```typescript
import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";

// Encrypt/decrypt using KMS-managed keys
// Keys are never exposed to your application
```

#### Option B: HashiCorp Vault
```typescript
// Vault provides encryption-as-a-service
// Keys are managed by Vault, never in your code
```

#### Option C: Azure Key Vault / Google Cloud KMS
- Similar to AWS KMS
- Keys are managed by the cloud provider

### 2. **Key Rotation Strategy**

**Current Limitation**: Rotating the key requires re-encrypting all data.

**Best Practice**:
- Use key versioning (store key version with encrypted data)
- Periodically rotate keys (e.g., every 90 days)
- Keep old keys for decryption during transition period

### 3. **Environment-Specific Keys**

Use different keys for:
- Development
- Staging
- Production

**Never use production keys in development!**

### 4. **Access Control**

Limit who can access the encryption key:
- Use IAM roles (AWS/GCP/Azure)
- Use secret management tools (AWS Secrets Manager, Azure Key Vault)
- Implement audit logging for key access

### 5. **Key Storage Locations** (Best to Worst)

1. ✅ **Key Management Service (KMS)** - Best practice
2. ✅ **Secret Management Service** (AWS Secrets Manager, Azure Key Vault)
3. ⚠️ **Environment Variables** (current) - Acceptable for small apps
4. ❌ **In Code** - Never do this
5. ❌ **In Version Control** - Never do this

## Recommendations for Your Application

### Short Term (Current Setup)
1. ✅ Store `ENCRYPTION_KEY` in environment variables (already done)
2. ✅ Never commit keys to version control
3. ✅ Use different keys per environment
4. ⚠️ Rotate keys periodically (manual process)

### Medium Term (Improvements)
1. **Use a Secret Management Service:**
   - Vercel: Use Vercel Environment Variables (encrypted at rest)
   - AWS: Use AWS Secrets Manager
   - Other: Use your hosting provider's secret management

2. **Implement Key Rotation:**
   - Create a migration script to re-encrypt data with new key
   - Support multiple key versions during transition

3. **Add Key Access Logging:**
   - Log when encryption/decryption operations occur
   - Monitor for unusual patterns

### Long Term (Enterprise-Grade)
1. **Use a Key Management Service (KMS):**
   - AWS KMS, Azure Key Vault, or HashiCorp Vault
   - Keys are managed by the service, never exposed to your app

2. **Implement Field-Level Encryption with Key Derivation:**
   - Derive unique keys per user/tenant
   - Even if one key is compromised, others remain secure

3. **Add Hardware Security Modules (HSM):**
   - For maximum security (enterprise use cases)

## Additional Security Layers

Remember: Encryption at rest is ONE layer. You also need:

1. ✅ **Database Access Controls** - Limit who can access the database
2. ✅ **Network Security** - Encrypt data in transit (HTTPS/TLS)
3. ✅ **Application Security** - Authentication, authorization, input validation
4. ✅ **Audit Logging** - Track who accesses what data
5. ✅ **Regular Security Audits** - Review and update security measures

## Compliance Considerations

### GDPR
- Encryption at rest is a recommended security measure
- Helps demonstrate "appropriate technical measures"

### CCPA
- Encryption helps protect personal information
- Required for certain types of data

### HIPAA (if handling health data)
- Encryption at rest is required for ePHI
- Must use approved encryption standards (AES-256 qualifies)

## Key Generation

To generate a secure encryption key:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

## Migration Strategy

If you need to rotate keys:

1. Generate a new key
2. Create a migration script that:
   - Reads all encrypted data
   - Decrypts with old key
   - Encrypts with new key
   - Updates database
3. Update `ENCRYPTION_KEY` environment variable
4. Keep old key for rollback (store securely, delete after verification)

## Conclusion

**Current Setup**: Acceptable for a small-to-medium application
**Next Step**: Move to a Secret Management Service
**Long Term**: Consider a Key Management Service for enterprise-grade security

Remember: Security is about layers. Encryption at rest is one important layer, but it works best when combined with other security measures.

