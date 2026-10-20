# Spring Boot to Express conversion notes

- `@RestController` mappings were recreated as Express routers while retaining the `/api/...` route families.
- Spring services/repositories were replaced with `mysql2` query functions and route/controller logic.
- Spring Security/JWT was replaced with `jsonwebtoken` authentication middleware and role checks.
- BCrypt password encoding was replaced with `bcryptjs` using 12 salt rounds.
- JavaMailSender was replaced with Nodemailer.
- JPA `@ElementCollection` values for package images, included/excluded lists, and tour plan are represented as MySQL JSON columns in the new schema.
- CORS is configured through `CORS_ORIGINS`; error responses use a centralized Express error handler.
- Admin-only mutation routes are deliberately protected, unlike the current uploaded Spring Security config's broad `/api/**` permit rule.
- Existing database data is not auto-migrated; follow the data migration section in README.
