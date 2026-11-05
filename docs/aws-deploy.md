# main 자동 배포 준비

main push 또는 main에서 수동 실행 → 검사 → 빌드 → S3 업로드 → CloudFront 캐시 무효화.
네임서버 전파 여부와 관계없이 배포 가능. 이 문서와 워크플로를 main에 반영해야 활성화됩니다.

## AWS IAM

IAM → 자격 증명 공급자 → 공급자 추가:

- 유형: OpenID Connect
- URL: https://token.actions.githubusercontent.com
- 대상: sts.amazonaws.com

IAM 역할 `urluv-github-deploy`를 생성하고 신뢰 정책을 설정합니다:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::847547469892:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:anniversary-site/frontend:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

역할에 연결할 권한 정책:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "s3:ListBucket", "Resource": "arn:aws:s3:::urluv-frontend" },
    { "Effect": "Allow", "Action": "s3:PutObject", "Resource": "arn:aws:s3:::urluv-frontend/*" },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::847547469892:distribution/E23JG24TYCZW1N"
    }
  ]
}
```

## GitHub 변수

frontend 저장소 → Settings → Secrets and variables → Actions → Variables에서 등록:

| 이름                | 값                                                                    |
| ------------------- | --------------------------------------------------------------------- |
| AWS_ROLE_ARN        | 생성한 IAM 역할 ARN                                                   |
| VITE_API_URL        | https://dh7rgee1s6v8m.cloudfront.net/api/v1                           |
| VITE_ADMIN_BACK_URL | 실제 관리자 API 기본 URL (API.js와 달리 AdminAPI.js의 경로 규칙 확인) |

프론트 환경변수는 JS에 공개됩니다. 비밀번호·AWS 키를 넣지 않습니다.
로컬 .env 파일은 업로드하지 않습니다. 목업 사용 플래그는 워크플로에서 true로 지정합니다.
AWS 액세스 키 대신 OIDC 임시 자격증명을 사용합니다.

기존 해시 자산은 열린 탭의 청크 로딩을 위해 삭제하지 않습니다. 장기적으로 별도 정리 정책을 운영하세요.
CloudFront 경로 재작성 함수/OAC/인증서/DNS는 기존 콘솔 설정을 사용합니다.
GitHub 조직의 Actions 사용 정책에서 공식 actions 및 aws-actions가 허용되어야 합니다.
