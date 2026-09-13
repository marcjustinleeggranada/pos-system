# Quick POS API smoke test - run while `npm run dev` is active
# Usage: .\scripts\test-api.ps1

$baseUrl = "http://localhost:3000"

Write-Host "`n--- LOGIN ---" -ForegroundColor Cyan
$loginBody = '{"email":"owner@vape.com","password":"password123"}'
try {
  $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
  Write-Host "OK - logged in as $($login.user.email) (store $($login.user.storeId))"
} catch {
  Write-Host "FAILED - is npm run dev running?" -ForegroundColor Red
  exit 1
}

$headers = @{ Authorization = "Bearer $($login.token)" }

Write-Host "`n--- LIST PRODUCTS ---" -ForegroundColor Cyan
$products = Invoke-RestMethod -Uri "$baseUrl/api/products/manage" -Headers $headers
$products.products | Format-Table id, name, price, stockQuantity

Write-Host "Done. Token expires in 8 hours - re-run this script anytime.`n"
