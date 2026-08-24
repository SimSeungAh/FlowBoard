param(
    [string]$ApiBase = "http://localhost:8080/api",
    [string]$FrontendBase = "http://localhost:5173",
    [string]$OwnerEmail = "aaa@a.a",
    [string]$OwnerPassword = "aaaaaaa!",
    [switch]$Recreate
)

$ErrorActionPreference = "Stop"

# FlowBoard demo seed script v5 - LocalDateTime serialization fix

$DemoBoardTitle = "FlowBoard 데모 · Web Platform"
$DemoPassword = "Demo1234!"

function Write-Step {
    param([string]$Message)

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkGray
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor DarkGray
}

function Get-ErrorMessage {
    param($ErrorRecord)

    if ($null -ne $ErrorRecord.ErrorDetails -and $ErrorRecord.ErrorDetails.Message) {
        return $ErrorRecord.ErrorDetails.Message
    }

    if ($ErrorRecord.Exception.Message) {
        return $ErrorRecord.Exception.Message
    }

    return "알 수 없는 오류"
}

# Windows PowerShell 5.1 호환용 HTTP 처리
# - PowerShell 7 스타일의 줄바꿈 메서드 체이닝을 사용하지 않습니다.
# - 응답 바이트를 직접 UTF-8로 디코딩해 한글 깨짐을 방지합니다.
Add-Type -AssemblyName System.Net.Http

$script:FlowHttpClient = New-Object -TypeName System.Net.Http.HttpClient
$script:FlowHttpClient.Timeout = [TimeSpan]::FromSeconds(60)

function Invoke-FlowApi {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("GET", "POST", "PATCH", "DELETE")]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [object]$Body = $null,

        [string]$Token = ""
    )

    $uri = "$ApiBase$Path"

    $httpMethod = New-Object -TypeName System.Net.Http.HttpMethod -ArgumentList $Method
    $request = New-Object -TypeName System.Net.Http.HttpRequestMessage -ArgumentList $httpMethod, $uri

    try {
        $acceptHeader = New-Object -TypeName System.Net.Http.Headers.MediaTypeWithQualityHeaderValue -ArgumentList "application/json"
        $request.Headers.Accept.Add($acceptHeader)

        if ($Token) {
            $authHeader = New-Object -TypeName System.Net.Http.Headers.AuthenticationHeaderValue -ArgumentList "Bearer", $Token
            $request.Headers.Authorization = $authHeader
        }

        if ($null -ne $Body) {
            $json = $Body | ConvertTo-Json -Depth 20 -Compress

            $request.Content = New-Object `
                -TypeName System.Net.Http.StringContent `
                -ArgumentList $json, ([System.Text.Encoding]::UTF8), "application/json"
        }

        # Windows PowerShell 5.1에서는 아래처럼 한 줄씩 호출해야 안전합니다.
        $sendTask = $script:FlowHttpClient.SendAsync($request)
        $response = $sendTask.GetAwaiter().GetResult()

        try {
            $readTask = $response.Content.ReadAsByteArrayAsync()
            $responseBytes = $readTask.GetAwaiter().GetResult()
            $responseText = [System.Text.Encoding]::UTF8.GetString($responseBytes)

            if (-not $response.IsSuccessStatusCode) {
                throw "HTTP $([int]$response.StatusCode) $($response.ReasonPhrase)`n$responseText"
            }

            if ([string]::IsNullOrWhiteSpace($responseText)) {
                return $null
            }

            return $responseText | ConvertFrom-Json
        }
        finally {
            $response.Dispose()
        }
    }
    finally {
        # HttpRequestMessage는 IDisposable이므로 정리합니다.
        # HttpMethod는 IDisposable이 아니므로 Dispose()를 호출하면
        # Windows PowerShell 5.1에서 오류가 발생합니다.
        $request.Dispose()
    }
}

function Login-FlowBoard {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Email,

        [Parameter(Mandatory = $true)]
        [string]$Password
    )

    $response = Invoke-FlowApi `
        -Method POST `
        -Path "/auth/login" `
        -Body @{
            email = $Email
            password = $Password
        }

    return $response.data.accessToken
}

function Ensure-DemoAccount {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Email,

        [Parameter(Mandatory = $true)]
        [string]$Nickname
    )

    try {
        Invoke-FlowApi `
            -Method POST `
            -Path "/auth/signup" `
            -Body @{
                email = $Email
                password = $DemoPassword
                nickname = $Nickname
            } | Out-Null

        Write-Host "  + 더미 계정 생성: $Nickname <$Email>" -ForegroundColor Green
    }
    catch {
        try {
            Login-FlowBoard `
                -Email $Email `
                -Password $DemoPassword | Out-Null

            Write-Host "  = 기존 더미 계정 사용: $Nickname <$Email>" -ForegroundColor DarkGray
        }
        catch {
            throw "더미 계정 '$Email'을 준비하지 못했습니다.`n$(Get-ErrorMessage $_)"
        }
    }

    return Login-FlowBoard `
        -Email $Email `
        -Password $DemoPassword
}

function New-DueDate {
    param(
        [AllowNull()]
        [object]$OffsetDays
    )

    if ($null -eq $OffsetDays) {
        return $null
    }

    # Spring의 LocalDateTime이 읽을 수 있도록
    # 타임존(+09:00)이 없는 yyyy-MM-ddTHH:mm:ss 문자열로 보냅니다.
    #
    # 중요:
    # Windows PowerShell 5.1에서는
    #   return (Get-Date).Date
    #       .AddDays(...)
    # 처럼 줄을 나누면 return이 첫 줄에서 끝나 DateTime 객체가 반환될 수 있습니다.
    # DateTime 객체가 ConvertTo-Json되면 +09:00 오프셋이 붙을 수 있고,
    # 백엔드 LocalDateTime 역직렬화가 HTTP 400으로 실패합니다.
    $date = (Get-Date).Date.AddDays([int]$OffsetDays).AddHours(18)

    return $date.ToString(
        "yyyy-MM-dd'T'HH:mm:ss",
        [System.Globalization.CultureInfo]::InvariantCulture
    )
}

function Get-DemoDescription {
    param($CardDefinition)

    switch ($CardDefinition.Type) {
        "REQUIREMENT" {
            return @"
## 배경
- 실제 사용자가 겪는 문제와 필요한 기능을 정리합니다.
- 관련 팀이 같은 기준으로 개발할 수 있도록 요구사항을 명확하게 정의합니다.

## 핵심 요구사항
- $($CardDefinition.Title)
- 담당자와 관련 작업이 한 화면에서 연결되어야 합니다.
- 변경 이력이 활동 기록에 남아야 합니다.

## 수용 기준
- [ ] 정상 흐름이 정의되어 있다.
- [ ] 예외 상황이 정의되어 있다.
- [ ] 개발/QA가 확인할 기준이 있다.
"@
        }

        "DESIGN_REVIEW" {
            return @"
## 리뷰 대상
- $($CardDefinition.Title)

## 확인 항목
- 정보 우선순위와 시선 흐름
- 데스크톱 작업 공간의 밀도
- 버튼/필터/상태 표현의 일관성
- 8개 사이트 테마에서의 가독성

## 리뷰 결과
- 수정 의견을 댓글로 정리하고 반영 여부를 체크리스트로 관리합니다.
"@
        }

        "BUG" {
            return @"
## 현상
- $($CardDefinition.Title)

## 재현 절차
1. 테스트 계정으로 보드에 접속합니다.
2. 관련 기능을 반복 실행합니다.
3. 화면과 네트워크 응답을 확인합니다.

## 기대 결과
- 중복 처리나 상태 꼬임 없이 동일한 결과가 유지되어야 합니다.

## 참고
- 재현 여부와 수정 후 검증 결과를 댓글에 기록합니다.
"@
        }

        "TEST_CASE" {
            return @"
## 테스트 유형
- $($CardDefinition.TestCaseType)

## 테스트 목적
- $($CardDefinition.Title)

## 사전 조건
- 테스트 사용자가 로그인되어 있습니다.
- 테스트용 보드와 카드 데이터가 준비되어 있습니다.

## 테스트 절차
1. 대상 화면에 접속합니다.
2. 테스트 조건에 맞는 입력 또는 동작을 수행합니다.
3. 화면 상태와 API 결과를 확인합니다.
4. 새로고침 또는 재접속 후 데이터 유지 여부를 확인합니다.

## 예상 결과
- 요구사항과 권한 정책에 맞게 동작해야 합니다.

## 실제 결과
- 테스트 실행 후 결과를 PASS / FAIL / BLOCKED로 기록합니다.
"@
        }

        "SECURITY_REVIEW" {
            return @"
## 점검 대상
- $($CardDefinition.SecurityScope)

## 발견 내용
- $($CardDefinition.Title)

## 위험
- 권한 우회, 정보 노출 또는 비정상 요청 가능성을 점검합니다.

## 대응 계획
- 서버 측 검증을 우선 적용합니다.
- 클라이언트 제한만으로 보안을 보장하지 않습니다.
- 수정 후 재현 절차를 다시 수행합니다.

## 재검증
- 조치 완료 후 VERIFIED 상태로 변경합니다.
"@
        }

        "RELEASE_CHECK" {
            return @"
## 릴리즈 작업
- $($CardDefinition.Title)

## 배포 전 확인
- [ ] 빌드 성공
- [ ] 환경 변수 확인
- [ ] DB 변경 사항 확인
- [ ] Smoke Test 준비
- [ ] 롤백 절차 확인

## 배포 후 확인
- 주요 API와 WebSocket 연결 상태를 확인합니다.
- 치명적인 오류가 있으면 즉시 롤백 여부를 판단합니다.
"@
        }

        default {
            return @"
## 작업 내용
- $($CardDefinition.Title)

## 완료 기준
- 기능 요구사항을 충족합니다.
- 권한 및 예외 상황을 확인합니다.
- 관련 테스트를 수행합니다.
- 필요한 경우 문서와 활동 기록을 갱신합니다.
"@
        }
    }
}

Write-Step "1. FlowBoard 백엔드 연결 / OWNER 로그인"

try {
    $ownerToken = Login-FlowBoard `
        -Email $OwnerEmail `
        -Password $OwnerPassword
}
catch {
    throw @"
로그인에 실패했습니다.

확인할 것:
1. FlowBoard 백엔드가 http://localhost:8080 에 실행 중인지
2. MySQL / Redis가 정상 실행 중인지
3. 입력한 OWNER 계정이 존재하는지

오류:
$(Get-ErrorMessage $_)
"@
}

Write-Host "OWNER 로그인 성공" -ForegroundColor Green

Write-Step "2. 데모용 팀원 계정 준비"

$demoUsers = @(
    @{
        Email = "flow.pm.demo@example.com"
        Nickname = "정수연"
        Role = "MEMBER"
    },
    @{
        Email = "flow.front.demo@example.com"
        Nickname = "이지윤"
        Role = "MEMBER"
    },
    @{
        Email = "flow.back.demo@example.com"
        Nickname = "최민수"
        Role = "MEMBER"
    },
    @{
        Email = "flow.qa.demo@example.com"
        Nickname = "이서연"
        Role = "MEMBER"
    },
    @{
        Email = "flow.security.demo@example.com"
        Nickname = "박소연"
        Role = "MEMBER"
    },
    @{
        Email = "flow.viewer.demo@example.com"
        Nickname = "김지훈"
        Role = "VIEWER"
    }
)

$userTokens = @{}

foreach ($user in $demoUsers) {
    $userTokens[$user.Email] = Ensure-DemoAccount `
        -Email $user.Email `
        -Nickname $user.Nickname
}

$userTokens[$OwnerEmail] = $ownerToken

Write-Step "3. 데모 보드 준비"

$boardsResponse = Invoke-FlowApi `
    -Method GET `
    -Path "/boards" `
    -Token $ownerToken

$existingBoard = $boardsResponse.data |
    Where-Object { $_.title -eq $DemoBoardTitle } |
    Select-Object -First 1

if ($null -ne $existingBoard) {
    if ($Recreate) {
        Write-Host "기존 데모 보드 삭제 중: #$($existingBoard.id)" -ForegroundColor Yellow

        Invoke-FlowApi `
            -Method DELETE `
            -Path "/boards/$($existingBoard.id)" `
            -Token $ownerToken | Out-Null
    }
    else {
        Write-Host ""
        Write-Host "이미 '$DemoBoardTitle' 보드가 있습니다." -ForegroundColor Yellow
        Write-Host "중복 데이터를 만들지 않고 종료합니다." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "바로 보기:" -ForegroundColor Cyan
        Write-Host "$FrontendBase/boards/$($existingBoard.id)" -ForegroundColor Green
        Write-Host ""
        Write-Host "완전히 새로 만들려면:" -ForegroundColor Cyan
        Write-Host ".\seed-flowboard-demo.ps1 -Recreate" -ForegroundColor White
        return
    }
}

$boardResponse = Invoke-FlowApi `
    -Method POST `
    -Path "/boards" `
    -Token $ownerToken `
    -Body @{
        title = $DemoBoardTitle
        description = "기획부터 배포까지 FlowBoard의 카드, 필터, 테스트 케이스, 보안 점검, 활동 기록과 팀 협업 화면을 한 번에 확인하기 위한 데모 프로젝트입니다."
    }

$boardId = [int]$boardResponse.data.id

Write-Host "데모 보드 생성 완료: #$boardId" -ForegroundColor Green

Write-Step "4. 6단계 개발 워크플로우 구성"

$desiredColumns = @(
    "기획",
    "디자인",
    "개발 중",
    "코드 리뷰",
    "QA",
    "배포 준비"
)

# 컬럼 이름을 응답 문자열로 다시 비교하지 않고,
# 실제 컬럼 ID를 생성/수정 시점에 바로 저장합니다.
# 이렇게 하면 Windows PowerShell 5.1의 한글 응답 인코딩 문제와
# 컬럼 이름 비교 문제를 동시에 피할 수 있습니다.
$columnsResponse = Invoke-FlowApi `
    -Method GET `
    -Path "/boards/$boardId/columns" `
    -Token $ownerToken

$defaultColumns = @($columnsResponse.data)

if ($defaultColumns.Count -lt 3) {
    throw "기본 컬럼이 3개보다 적습니다. 현재 컬럼 수: $($defaultColumns.Count)"
}

$columnsByTitle = @{}

for ($index = 0; $index -lt 3; $index++) {
    $columnId = [int]$defaultColumns[$index].id
    $desiredTitle = $desiredColumns[$index]

    Invoke-FlowApi `
        -Method PATCH `
        -Path "/boards/$boardId/columns/$columnId" `
        -Token $ownerToken `
        -Body @{
            title = $desiredTitle
        } | Out-Null

    $columnsByTitle[$desiredTitle] = $columnId
}

for ($index = 3; $index -lt $desiredColumns.Count; $index++) {
    $desiredTitle = $desiredColumns[$index]

    $createdColumnResponse = Invoke-FlowApi `
        -Method POST `
        -Path "/boards/$boardId/columns" `
        -Token $ownerToken `
        -Body @{
            title = $desiredTitle
        }

    $createdColumnId = [int]$createdColumnResponse.data.id

    if ($createdColumnId -le 0) {
        throw "컬럼 '$desiredTitle' 생성 응답에서 ID를 확인할 수 없습니다."
    }

    $columnsByTitle[$desiredTitle] = $createdColumnId
}

foreach ($desiredTitle in $desiredColumns) {
    if (-not $columnsByTitle.ContainsKey($desiredTitle)) {
        throw "컬럼 '$desiredTitle' ID 매핑에 실패했습니다."
    }
}

Write-Host "워크플로우: $($desiredColumns -join ' → ')" -ForegroundColor Green

Write-Step "5. 팀원 초대"

foreach ($user in $demoUsers) {
    Invoke-FlowApi `
        -Method POST `
        -Path "/boards/$boardId/members" `
        -Token $ownerToken `
        -Body @{
            email = $user.Email
            role = $user.Role
        } | Out-Null

    Write-Host "  + $($user.Nickname) / $($user.Role)" -ForegroundColor Green
}

$membersResponse = Invoke-FlowApi `
    -Method GET `
    -Path "/boards/$boardId/members" `
    -Token $ownerToken

$memberByEmail = @{}

foreach ($member in $membersResponse.data) {
    $memberByEmail[$member.email] = $member
}

Write-Step "6. 태그 생성"

$tagDefinitions = @(
    @{ Name = "Frontend"; Color = "#3B82F6" },
    @{ Name = "Backend"; Color = "#16A34A" },
    @{ Name = "API"; Color = "#06B6D4" },
    @{ Name = "Design"; Color = "#8B5CF6" },
    @{ Name = "QA"; Color = "#EC4899" },
    @{ Name = "Bug"; Color = "#EF4444" },
    @{ Name = "Security"; Color = "#F59E0B" },
    @{ Name = "Release"; Color = "#14B8A6" },
    @{ Name = "Performance"; Color = "#F97316" },
    @{ Name = "Docs"; Color = "#64748B" },
    @{ Name = "PM"; Color = "#A855F7" },
    @{ Name = "Auth"; Color = "#0EA5E9" },
    @{ Name = "WebSocket"; Color = "#7C3AED" }
)

$tagsByName = @{}

foreach ($tagDefinition in $tagDefinitions) {
    $tagResponse = Invoke-FlowApi `
        -Method POST `
        -Path "/boards/$boardId/tags" `
        -Token $ownerToken `
        -Body @{
            name = $tagDefinition.Name
            color = $tagDefinition.Color
        }

    $tagsByName[$tagDefinition.Name] = $tagResponse.data
}

Write-Host "$($tagDefinitions.Count)개 태그 생성 완료" -ForegroundColor Green

Write-Step "7. 풍부한 데모 카드 48개 생성"

$cards = @(
    # 기획
    @{ Column="기획"; Title="사용자 로그인 및 계정 관리 요구사항"; Type="REQUIREMENT"; Tags=@("PM","Auth"); User="flow.pm.demo@example.com"; Due=3 },
    @{ Column="기획"; Title="OWNER / MEMBER / VIEWER 권한 정책 정리"; Type="REQUIREMENT"; Tags=@("PM","Security"); User="flow.pm.demo@example.com"; Due=4 },
    @{ Column="기획"; Title="프로젝트 대시보드 핵심 지표 정의"; Type="GENERAL"; Tags=@("PM"); User=$OwnerEmail; Due=7 },
    @{ Column="기획"; Title="작업 검색 및 필터 UX 요구사항"; Type="REQUIREMENT"; Tags=@("PM","Frontend"); User="flow.pm.demo@example.com"; Due=5 },
    @{ Column="기획"; Title="알림 시스템 개선 범위 정의"; Type="GENERAL"; Tags=@("PM","Backend"); User=$OwnerEmail; Due=$null },
    @{ Column="기획"; Title="화이트보드 다중 보드 요구사항"; Type="REQUIREMENT"; Tags=@("PM","Design"); User="flow.pm.demo@example.com"; Due=9 },
    @{ Column="기획"; Title="Q3 릴리즈 범위 및 우선순위 확정"; Type="RELEASE_CHECK"; Tags=@("PM","Release"); User=$OwnerEmail; Due=12 },
    @{ Column="기획"; Title="API 문서 자동화 방향 조사"; Type="GENERAL"; Tags=@("Docs","API"); User="flow.back.demo@example.com"; Due=10 },

    # 디자인
    @{ Column="디자인"; Title="대시보드 UI 1차 시안 리뷰"; Type="DESIGN_REVIEW"; Tags=@("Design","Frontend"); User="flow.front.demo@example.com"; Due=2 },
    @{ Column="디자인"; Title="카드 상세 우측 패널 정보 구조 리뷰"; Type="DESIGN_REVIEW"; Tags=@("Design","Frontend"); User="flow.front.demo@example.com"; Due=1 },
    @{ Column="디자인"; Title="칸반 필터 컴팩트 UI 리뷰"; Type="DESIGN_REVIEW"; Tags=@("Design","Frontend"); User="flow.front.demo@example.com"; Due=0 },
    @{ Column="디자인"; Title="화이트보드 툴바 인터랙션 개선"; Type="DESIGN_REVIEW"; Tags=@("Design"); User="flow.front.demo@example.com"; Due=6 },
    @{ Column="디자인"; Title="빈 상태 컴포넌트 표현 통일"; Type="DESIGN_REVIEW"; Tags=@("Design","Frontend"); User="flow.front.demo@example.com"; Due=8 },
    @{ Column="디자인"; Title="8개 테마 대비 및 가독성 검토"; Type="DESIGN_REVIEW"; Tags=@("Design"); User="flow.front.demo@example.com"; Due=4 },
    @{ Column="디자인"; Title="테스트 케이스 전용 페이지 테이블 밀도 조정"; Type="GENERAL"; Tags=@("Design","QA"); User="flow.qa.demo@example.com"; Due=5 },
    @{ Column="디자인"; Title="보안 점검 심각도 배지 시각 체계 검토"; Type="GENERAL"; Tags=@("Design","Security"); User="flow.security.demo@example.com"; Due=$null },

    # 개발 중
    @{ Column="개발 중"; Title="사용자 프로필 API 개발"; Type="GENERAL"; Tags=@("Backend","API"); User="flow.back.demo@example.com"; Due=3 },
    @{ Column="개발 중"; Title="프로젝트 대시보드 실제 데이터 연동"; Type="GENERAL"; Tags=@("Frontend","Backend"); User="flow.front.demo@example.com"; Due=6 },
    @{ Column="개발 중"; Title="실시간 알림 WebSocket 이벤트 구현"; Type="GENERAL"; Tags=@("Backend","WebSocket"); User="flow.back.demo@example.com"; Due=8 },
    @{ Column="개발 중"; Title="파일 업로드 API 및 제한 정책 구현"; Type="GENERAL"; Tags=@("Backend","API"); User="flow.back.demo@example.com"; Due=11 },
    @{ Column="개발 중"; Title="카드 검색 응답 속도 개선"; Type="GENERAL"; Tags=@("Backend","Performance"); User="flow.back.demo@example.com"; Due=7 },
    @{ Column="개발 중"; Title="담당자 + 태그 + 마감일 AND 필터 개선"; Type="GENERAL"; Tags=@("Frontend","Backend"); User="flow.front.demo@example.com"; Due=4 },
    @{ Column="개발 중"; Title="WebSocket 재연결 시 이벤트 누락"; Type="BUG"; Tags=@("Bug","WebSocket"); User="flow.back.demo@example.com"; Due=-1 },
    @{ Column="개발 중"; Title="마감일 타임존 변환 시 하루 차이 발생"; Type="BUG"; Tags=@("Bug","Frontend"); User="flow.front.demo@example.com"; Due=-2 },

    # 코드 리뷰
    @{ Column="코드 리뷰"; Title="Refresh Token 재사용 공격 가능성 점검"; Type="SECURITY_REVIEW"; Tags=@("Security","Auth","Backend"); User="flow.security.demo@example.com"; Due=2; SecuritySeverity="HIGH"; SecurityStatus="IN_PROGRESS"; SecurityScope="/api/auth/reissue" },
    @{ Column="코드 리뷰"; Title="VIEWER 카드 삭제 API 권한 검증 누락"; Type="SECURITY_REVIEW"; Tags=@("Security","API"); User="flow.security.demo@example.com"; Due=-1; SecuritySeverity="CRITICAL"; SecurityStatus="RETEST_REQUIRED"; SecurityScope="DELETE /api/cards/{cardId}" },
    @{ Column="코드 리뷰"; Title="보드 멤버 API IDOR 가능성 검토"; Type="SECURITY_REVIEW"; Tags=@("Security","API"); User="flow.security.demo@example.com"; Due=1; SecuritySeverity="CRITICAL"; SecurityStatus="IN_PROGRESS"; SecurityScope="/api/boards/{boardId}/members" },
    @{ Column="코드 리뷰"; Title="댓글 WebSocket 중복 이벤트 처리 리뷰"; Type="BUG"; Tags=@("Bug","WebSocket"); User="flow.back.demo@example.com"; Due=3 },
    @{ Column="코드 리뷰"; Title="LexoRank 반복 이동 경계 처리 리뷰"; Type="GENERAL"; Tags=@("Backend","Performance"); User="flow.back.demo@example.com"; Due=4 },
    @{ Column="코드 리뷰"; Title="TanStack Query 캐시 갱신 범위 리뷰"; Type="GENERAL"; Tags=@("Frontend","Performance"); User="flow.front.demo@example.com"; Due=5 },
    @{ Column="코드 리뷰"; Title="화이트보드 긴 선 분할 저장 로직 리뷰"; Type="GENERAL"; Tags=@("Frontend","Backend"); User="flow.back.demo@example.com"; Due=7 },
    @{ Column="코드 리뷰"; Title="민감 정보 로그 출력 가능성 점검"; Type="SECURITY_REVIEW"; Tags=@("Security","Backend"); User="flow.security.demo@example.com"; Due=6; SecuritySeverity="MEDIUM"; SecurityStatus="VERIFIED"; SecurityScope="Spring Boot application log" },

    # QA
    @{ Column="QA"; Title="정상 계정으로 로그인"; Type="TEST_CASE"; Tags=@("QA","Auth"); User="flow.qa.demo@example.com"; Due=0; TestCaseType="NORMAL"; TestResult="PASS" },
    @{ Column="QA"; Title="잘못된 비밀번호로 로그인 시 차단"; Type="TEST_CASE"; Tags=@("QA","Auth"); User="flow.qa.demo@example.com"; Due=0; TestCaseType="EXCEPTION"; TestResult="PASS" },
    @{ Column="QA"; Title="카드 제목 없이 생성 시도"; Type="TEST_CASE"; Tags=@("QA","Frontend"); User="flow.qa.demo@example.com"; Due=1; TestCaseType="EXCEPTION"; TestResult="PASS" },
    @{ Column="QA"; Title="카드 제목 100자 경계값 검증"; Type="TEST_CASE"; Tags=@("QA","Frontend"); User="flow.qa.demo@example.com"; Due=1; TestCaseType="BOUNDARY"; TestResult="PASS" },
    @{ Column="QA"; Title="VIEWER 카드 생성 및 수정 차단"; Type="TEST_CASE"; Tags=@("QA","Security"); User="flow.qa.demo@example.com"; Due=2; TestCaseType="PERMISSION"; TestResult="PASS" },
    @{ Column="QA"; Title="만료 JWT로 보호 API 접근"; Type="TEST_CASE"; Tags=@("QA","Security","Auth"); User="flow.qa.demo@example.com"; Due=2; TestCaseType="SECURITY"; TestResult="FAIL" },
    @{ Column="QA"; Title="WebSocket 연결 끊김 후 자동 복구"; Type="TEST_CASE"; Tags=@("QA","WebSocket"); User="flow.qa.demo@example.com"; Due=3; TestCaseType="RECOVERY"; TestResult="BLOCKED" },
    @{ Column="QA"; Title="카드 DnD → 저장 → 다른 사용자 실시간 반영"; Type="TEST_CASE"; Tags=@("QA","WebSocket"); User="flow.qa.demo@example.com"; Due=3; TestCaseType="E2E"; TestResult="PASS" },

    # 배포 준비
    @{ Column="배포 준비"; Title="v1.2.0 릴리즈 체크"; Type="RELEASE_CHECK"; Tags=@("Release"); User=$OwnerEmail; Due=5 },
    @{ Column="배포 준비"; Title="Production 환경 변수 최종 점검"; Type="RELEASE_CHECK"; Tags=@("Release","Backend"); User="flow.back.demo@example.com"; Due=4 },
    @{ Column="배포 준비"; Title="DB 백업 및 롤백 절차 확인"; Type="RELEASE_CHECK"; Tags=@("Release","Backend"); User="flow.back.demo@example.com"; Due=4 },
    @{ Column="배포 준비"; Title="배포 후 핵심 API Smoke Test"; Type="TEST_CASE"; Tags=@("Release","QA","API"); User="flow.qa.demo@example.com"; Due=5; TestCaseType="INTEGRATION"; TestResult="NOT_RUN" },
    @{ Column="배포 준비"; Title="배포 후 WebSocket 실시간 동기화 확인"; Type="TEST_CASE"; Tags=@("Release","QA","WebSocket"); User="flow.qa.demo@example.com"; Due=5; TestCaseType="E2E"; TestResult="NOT_RUN" },
    @{ Column="배포 준비"; Title="CORS 허용 Origin 범위 점검"; Type="SECURITY_REVIEW"; Tags=@("Release","Security"); User="flow.security.demo@example.com"; Due=3; SecuritySeverity="MEDIUM"; SecurityStatus="PENDING"; SecurityScope="Spring Security CORS configuration" },
    @{ Column="배포 준비"; Title="파일 업로드 확장자 및 크기 검증"; Type="SECURITY_REVIEW"; Tags=@("Security","API"); User="flow.security.demo@example.com"; Due=3; SecuritySeverity="HIGH"; SecurityStatus="RETEST_REQUIRED"; SecurityScope="File upload API" },
    @{ Column="배포 준비"; Title="릴리즈 노트 및 API 변경 문서 작성"; Type="GENERAL"; Tags=@("Docs","Release"); User="flow.pm.demo@example.com"; Due=5 }
)

$createdCards = @()

for ($index = 0; $index -lt $cards.Count; $index++) {
    $definition = $cards[$index]
    $columnId = $columnsByTitle[$definition.Column]

    if ($null -eq $columnId) {
        throw "컬럼 '$($definition.Column)'을 찾을 수 없습니다."
    }

    $payload = @{
        title = $definition.Title
        description = Get-DemoDescription -CardDefinition $definition
        dueDate = New-DueDate -OffsetDays $definition.Due
        taskType = $definition.Type
        testCaseType = $null
    }

    if ($definition.Type -eq "TEST_CASE") {
        $payload.testCaseType = $definition.TestCaseType
    }

    try {
        $cardResponse = Invoke-FlowApi `
            -Method POST `
            -Path "/boards/$boardId/columns/$columnId/cards" `
            -Token $ownerToken `
            -Body $payload
    }
    catch {
        $debugJson = $payload | ConvertTo-Json -Depth 20

        throw @"
데모 카드 생성 중 오류가 발생했습니다.

카드 번호: $($index + 1) / $($cards.Count)
컬럼: $($definition.Column)
제목: $($definition.Title)
작업 유형: $($definition.Type)
dueDate: $($payload.dueDate)

전송 JSON:
$debugJson

원래 오류:
$(Get-ErrorMessage $_)
"@
    }

    $card = $cardResponse.data
    $createdCards += $card

    foreach ($tagName in $definition.Tags) {
        $tag = $tagsByName[$tagName]

        if ($null -ne $tag) {
            Invoke-FlowApi `
                -Method POST `
                -Path "/cards/$($card.id)/tags/$($tag.id)" `
                -Token $ownerToken | Out-Null
        }
    }

    $member = $memberByEmail[$definition.User]

    if ($null -ne $member) {
        Invoke-FlowApi `
            -Method POST `
            -Path "/cards/$($card.id)/assignees" `
            -Token $ownerToken `
            -Body @{
                userId = [int]$member.userId
            } | Out-Null
    }

    if ($definition.Type -eq "TEST_CASE" -and $definition.TestResult) {
        Invoke-FlowApi `
            -Method PATCH `
            -Path "/cards/$($card.id)/test-case/result" `
            -Token $ownerToken `
            -Body @{
                testCaseResult = $definition.TestResult
            } | Out-Null
    }

    if ($definition.Type -eq "SECURITY_REVIEW") {
        Invoke-FlowApi `
            -Method PATCH `
            -Path "/cards/$($card.id)/security-review" `
            -Token $ownerToken `
            -Body @{
                securitySeverity = $definition.SecuritySeverity
                securityImpactScope = $definition.SecurityScope
                securityVerificationStatus = $definition.SecurityStatus
            } | Out-Null
    }

    if (($index % 4) -eq 0) {
        $checklistResponse = Invoke-FlowApi `
            -Method POST `
            -Path "/cards/$($card.id)/checklists" `
            -Token $ownerToken `
            -Body @{
                title = "완료 조건"
            }

        $checklistId = [int]$checklistResponse.data.id

        $checklistItems = @(
            "요구사항과 완료 기준 확인",
            "권한 및 예외 상황 검증",
            "관련 문서 또는 테스트 결과 갱신"
        )

        $createdItems = @()

        foreach ($itemText in $checklistItems) {
            $itemResponse = Invoke-FlowApi `
                -Method POST `
                -Path "/checklists/$checklistId/items" `
                -Token $ownerToken `
                -Body @{
                    content = $itemText
                }

            $createdItems += $itemResponse.data
        }

        if ($createdItems.Count -gt 0 -and ($index % 8) -ne 0) {
            $actorToken = $userTokens[$definition.User]

            if (-not $actorToken) {
                $actorToken = $ownerToken
            }

            Invoke-FlowApi `
                -Method PATCH `
                -Path "/checklist-items/$($createdItems[0].id)/toggle" `
                -Token $actorToken | Out-Null
        }
    }

    if (($index % 5) -eq 0) {
        $commentToken = $userTokens[$definition.User]

        if (-not $commentToken) {
            $commentToken = $ownerToken
        }

        Invoke-FlowApi `
            -Method POST `
            -Path "/cards/$($card.id)/comments" `
            -Token $commentToken `
            -Body @{
                content = "데모 확인용 코멘트입니다. 현재 진행 상황과 다음 확인 항목을 정리했습니다."
            } | Out-Null
    }

    $current = $index + 1
    Write-Progress `
        -Activity "FlowBoard 데모 카드 생성" `
        -Status "$current / $($cards.Count) - $($definition.Title)" `
        -PercentComplete (($current / $cards.Count) * 100)
}

Write-Progress `
    -Activity "FlowBoard 데모 카드 생성" `
    -Completed

Write-Step "8. 데모 데이터 생성 완료"

Write-Host "보드: $DemoBoardTitle" -ForegroundColor Green
Write-Host "보드 ID: $boardId" -ForegroundColor Green
Write-Host "컬럼: $($desiredColumns.Count)개" -ForegroundColor Green
Write-Host "카드: $($cards.Count)개" -ForegroundColor Green
Write-Host "태그: $($tagDefinitions.Count)개" -ForegroundColor Green
Write-Host "더미 팀원: $($demoUsers.Count)명" -ForegroundColor Green

Write-Host ""
Write-Host "확인하면 좋은 화면" -ForegroundColor Cyan
Write-Host "1. 칸반 보드 - 컬럼 내부 스크롤 / 필터 / DnD"
Write-Host "2. 테스트 케이스 - PASS / FAIL / BLOCKED / 미실행"
Write-Host "3. 보안 점검 - CRITICAL / HIGH / MEDIUM 및 검증 상태"
Write-Host "4. 작업 검색 - 담당자 / 태그 / 마감일 AND 필터"
Write-Host "5. 활동 기록 - 카드/멤버/태그/체크리스트 작업 이력"
Write-Host "6. 팀원 및 권한 - OWNER / MEMBER / VIEWER"

Write-Host ""
Write-Host "바로 열기:" -ForegroundColor Cyan
Write-Host "$FrontendBase/boards/$boardId" -ForegroundColor Green
