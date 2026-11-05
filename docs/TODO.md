# 남은 작업

- [ ] cupid.urluv.shop: GitHub Pages Custom domain 등록·인증서 발급·Enforce HTTPS 확인
- [ ] pepero.urluv.shop: Vercel 프로젝트 도메인 등록·DNS 검증·HTTPS 발급 확인
- [x] develop 브랜치 CI 작성 (린트·타입 검사·테스트·빌드). 원격 반영·첫 실행 확인 필요.
- [ ] main CD: GitHub Actions OIDC AssumeRoleWithWebIdentity 인증 실패 해결
- [ ] main CD: S3 업로드·CloudFront 무효화 성공 및 운영 접속 확인

서브도메인 CNAME은 Cloudflare에 등록 완료. DNS only 유지.
배포 역할 실제 이름: urluv-git-deploy. GitHub AWS_ROLE_ARN과 IAM 신뢰 정책 대조 필요.
신뢰 정책의 main sub·aud는 확인됨. IAM OIDC 공급자 ARN·Audience와 실제 실행 claims 확인 남음.
