using Microsoft.AspNetCore.Mvc;

namespace Magaza.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    // GET api/auth/check
    // Şifre kontrolünü Program.cs'teki ara katman zaten yapıyor:
    // buraya ulaşabiliyorsa şifre doğrudur. Giriş ekranı bunu kullanır.
    [HttpGet("check")]
    public IActionResult Check() => Ok(new { ok = true });
}
