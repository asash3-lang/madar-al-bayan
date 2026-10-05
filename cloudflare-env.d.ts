declare namespace Cloudflare {
  interface Env {
    ASSETS?: Fetcher;
    DB?: D1Database;
    BUCKET?: R2Bucket;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    COMMITTEE_REVIEWER_IDS?: string;
    RESEND_API_KEY?: string;
    MAIL_FROM?: string;
    ADMIN_PASSWORD_HASH?: string;
    ADMIN_USERNAME?: string;
    ADMIN_DISPLAY_NAME?: string;
  }
}
