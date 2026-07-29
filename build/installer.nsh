; Custom NSIS header for the Windows installer.
;
; Without ManifestDPIAware the installer declares itself DPI-unaware, so on any
; display running above 100% scaling — which is most laptops now — Windows
; renders it at 96 DPI and then bitmap-stretches the result. Every pixel of the
; window gets blurred, the logo worst of all, and an installer that looks out of
; focus is the first thing that makes people doubt what they are installing.
;
; Declaring awareness makes Windows hand over the real pixels instead.

!macro customHeader
  ManifestDPIAware true
!macroend
