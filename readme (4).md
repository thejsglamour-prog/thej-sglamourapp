# Public Assets

Place your uploaded images here to use them in the application.

1. **Application Logo**: Save your metallic circular logo image as `public/assets/logo.png`.
2. **CEO Portrait**: Save the portrait photo of Jerroo as `public/assets/ceo.jpg`.

## PWA Icon Generation

After placing `logo.png`, run this command to generate the required PWA icons:

```bash
npm install sharp --save-dev
node scripts/generate-icons.js public/assets/logo.png
```

This will create:
- `logo-192.png`
- `logo-512.png`
- `logo-maskable.png`

## Commitment

Once images are placed and icons generated, commit them:
`git add public/assets/* && git commit -m "feat: add local branding assets" && git push`