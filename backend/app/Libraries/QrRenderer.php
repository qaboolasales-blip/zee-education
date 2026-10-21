<?php

namespace App\Libraries;

use Endroid\QrCode\QrCode;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\SvgWriter;

/**
 * Renders a connect invite as a QR code the browser can display.
 *
 * WHY SVG AND NOT PNG
 * -------------------
 * endroid/qr-code can also emit PNG, but that needs the GD or Imagick
 * extension. Neither is guaranteed on cheap shared hosting (this machine has
 * neither), and adding "install GD" to a customer install guide is a support
 * burden for no benefit. SVG is assembled as plain text: no image extension is
 * needed, it stays sharp on any screen, and it is a few kilobytes.
 *
 * WHAT IS ENCODED
 * ---------------
 * Only "<verified domain>#c=<token>". No user id, no school id, no role, no
 * credential. Someone who photographs this QR learns only the domain, and even
 * the token expires within minutes.
 *
 * THE QR IS NOT A LOGIN
 * ---------------------
 * Scanning this sends the person to that school's own sign-in page. It routes
 * them; it does not authenticate them. Which school they end up in is still
 * resolved server-side from their session, never from the QR.
 *
 * PACKAGING CONSTRAINT - NO LABEL, NO LOGO
 * ----------------------------------------
 * endroid/qr-code ships two label fonts totalling 16.6 MB. They are read only
 * when a label or logo is attached to the QR code. This class attaches neither,
 * so the package build strips them (release/build-package.ps1).
 * If a text label or logo is ever added here, those two font files must be
 * restored in the package at the same time or the render will fail.
 */
class QrRenderer
{
    /** Rendered size in pixels. Purely presentational. */
    public const DEFAULT_SIZE = 320;

    /**
     * Quiet zone in modules. The QR specification requires at least 4 so that
     * phone cameras lock on reliably, especially on a printed handout.
     */
    private const QUIET_ZONE = 4;

    /**
     * Build a QR code and return it as an SVG string.
     */
    public function svg(string $payload, int $size = self::DEFAULT_SIZE): string
    {
        $size = max(120, min(1024, $size));

        $qr = QrCode::create($payload)
            ->setEncoding(new \Endroid\QrCode\Encoding\Encoding('UTF-8'))
            ->setSize($size)
            ->setMargin(self::QUIET_ZONE)
            ->setRoundBlockSizeMode(RoundBlockSizeMode::Margin);

        $result = (new SvgWriter())->write($qr);

        return $result->getString();
    }

    /**
     * Convenience: the full payload for a school's connect QR.
     */
    public function forInvite(string $host, string $token, int $size = self::DEFAULT_SIZE): string
    {
        return $this->svg(service('invites')->qrPayload($host, $token), $size);
    }
}