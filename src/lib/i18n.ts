export type Lang = 'en' | 'sv';

export const translations = {
  en: {
    // Header
    taglineContour: 'Contour Cut Generator',
    taglinePrint: 'Print with OPOS Regmarks',
    tabContour: 'Contour Generator',
    tabPrint: 'Sheet',

    // Steps
    step01: 'Upload Image',
    step02: 'Adjust Parameters',
    step03: 'Download PDF',
    step03wp: 'Save Design',

    // ImageUpload
    width: 'Width',
    height: 'Height',
    effectiveResolution: 'Effective resolution',
    dragDrop: 'Drag & drop your sticker image',
    dropFormats: 'PNG · JPEG · WEBP — up to 20 MB',
    dropIt: 'Drop it!',
    wrongFormat: 'PNG, JPEG or WEBP only',
    resolutionTooLow: 'Resolution too low',
    lowResolution: 'Low resolution',
    minRequired: 'Minimum',
    dpiRequired: 'DPI required.',
    recommendedDpi: 'Recommended',
    dpiQuality: 'DPI for best print quality.',
    useAI: 'Use AI to enhance.',
    enhanceBtn: 'Enhance with AI (4× upscale)',
    enhancing: 'Enhancing… (this may take ~30s)',
    goodResolution: 'Good resolution',

    // ParameterPanel
    thresholdSensitivity: 'Threshold sensitivity',
    smoothingLevel: 'Smoothing level',
    cutMode: 'Cut mode',
    kissCutOffset: 'Kiss cut offset',
    perfCutOffset: 'Perf cut offset',
    enclose: 'Enclose',
    outerContourOnly: 'outer contour only',
    solidLine: 'Solid line',
    dashedLine: 'Dashed line',
    solidDashed: 'Solid + dashed',

    // DownloadButton
    downloadPdf: 'Download PDF',
    saveDesign: 'Save Design',
    downloaded: 'Downloaded!',
    designSaved: 'Design Saved!',
    generating: 'Generating…',
    printReady: 'Print-ready PDF · CutContour spot color',
    customSticker: 'Custom sticker · CutContour PDF',

    // Preview
    livePreview: 'Live Preview',
    detectingContour: 'Detecting contour…',
    detectionFailed: 'Detection failed',

    // Footer
    footerLabel: 'Nimstick Cutz — Internal Print Tool',
  },
  sv: {
    // Header
    taglineContour: 'Kontursnitt-generator',
    taglinePrint: 'Utskriftsplanering med OPOS-märken',
    tabContour: 'Kontur-generator',
    tabPrint: 'Ark',

    // Steps
    step01: 'Ladda upp bild',
    step02: 'Justera parametrar',
    step03: 'Ladda ner PDF',
    step03wp: 'Spara design',

    // ImageUpload
    width: 'Bredd',
    height: 'Höjd',
    effectiveResolution: 'Effektiv upplösning',
    dragDrop: 'Dra och släpp din klistermärksbild',
    dropFormats: 'PNG · JPEG · WEBP — upp till 20 MB',
    dropIt: 'Släpp!',
    wrongFormat: 'Endast PNG, JPEG eller WEBP',
    resolutionTooLow: 'För låg upplösning',
    lowResolution: 'Låg upplösning',
    minRequired: 'Minst',
    dpiRequired: 'DPI krävs.',
    recommendedDpi: 'Rekommenderat',
    dpiQuality: 'DPI för bästa utskriftskvalitet.',
    useAI: 'Använd AI för att förbättra.',
    enhanceBtn: 'Förbättra med AI (4× uppskalning)',
    enhancing: 'Förbättrar… (kan ta ~30s)',
    goodResolution: 'Bra upplösning',

    // ParameterPanel
    thresholdSensitivity: 'Tröskelkänslighet',
    smoothingLevel: 'Utjämningsnivå',
    cutMode: 'Snittläge',
    kissCutOffset: 'Kiss cut-förskjutning',
    perfCutOffset: 'Perf cut-förskjutning',
    enclose: 'Omslut',
    outerContourOnly: 'endast ytterkontur',
    solidLine: 'Kiss Cut Ark',
    dashedLine: 'Utskuret',
    solidDashed: 'Kiss och Utskuret',

    // DownloadButton
    downloadPdf: 'Ladda ner PDF',
    saveDesign: 'Spara design',
    downloaded: 'Nedladdad!',
    designSaved: 'Design sparad!',
    generating: 'Genererar…',
    printReady: 'Utskriftsklar PDF · CutContour-färg',
    customSticker: 'Anpassat klistermärke · CutContour PDF',

    // Preview
    livePreview: 'Liveförhandsvisning',
    detectingContour: 'Identifierar kontur…',
    detectionFailed: 'Identifiering misslyckades',

    // Footer
    footerLabel: 'Nimstick Cutz — Internt utskriftsverktyg',
  },
} satisfies Record<Lang, Record<string, string>>;

export type T = typeof translations.en;
