# Portal Jurnal (Arc UI)

```bash
npm install
npx shadcn@latest add @uiarc/alert @uiarc/avatar @uiarc/badge @uiarc/button @uiarc/checkbox \
  @uiarc/confirm-morph @uiarc/date-picker @uiarc/dialog @uiarc/drawer @uiarc/empty-state \
  @uiarc/input @uiarc/password-field @uiarc/radio-group @uiarc/segmented-control \
  @uiarc/select @uiarc/skeleton @uiarc/textarea
npm run dev
```

Komponen Arc terpasang di `src/components/arc/`, termasuk `foundation.css` yang sudah diimpor di `src/main.tsx`.
Jika CLI shadcn meminta inisialisasi, jalankan `npx shadcn@latest init` lebih dulu, atau pakai URL penuh, misalnya
`npx shadcn@latest add https://uiarc.dev/r/button.json`.
