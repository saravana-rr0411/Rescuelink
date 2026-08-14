const fs = require('fs');

const path = 'src/components/common/GoogleMapsNavigationMode.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('useTranslation')) {
  content = content.replace(/import React, {([^}]+)} from 'react';/, "import React, { $1 } from 'react';\nimport { useTranslation } from 'react-i18next';");
  content = content.replace(/const GoogleMapsNavigationMode: React.FC<GoogleMapsNavigationModeProps> = \({([^}]+)}\) => {/, "const GoogleMapsNavigationMode: React.FC<GoogleMapsNavigationModeProps> = ({$1}) => {\n  const { t } = useTranslation();");
}

content = content.replace(/label="Zoom in map"/g, "label={t('nav.zoomIn')}");
content = content.replace(/label="Zoom out map"/g, "label={t('nav.zoomOut')}");
content = content.replace(/label="Re-center camera on volunteer"/g, "label={t('nav.recenter')}");
content = content.replace(/title="Re-center camera on volunteer"/g, "title={t('nav.recenter')}");
content = content.replace(/>TRANSPORTING</g, ">{t('emergencyStatus.transporting')}<");
content = content.replace(/>TO HOSPITAL</g, ">{t('emergencyStatus.toHospital')}<");
content = content.replace(/>Call Ambulance</g, ">{t('emergencyStatus.callAmbulance')}<");
content = content.replace(/>Call Hospital</g, ">{t('emergencyStatus.callHospital')}<");
content = content.replace(/>En Route</g, ">{t('emergencyStatus.enRoute')}<");
content = content.replace(/>to Hospital</g, ">{t('emergencyStatus.toHospital')}<");
content = content.replace(/>Reached</g, ">{t('emergencyStatus.reached')}<");
content = content.replace(/>Hospital</g, ">{t('emergencyStatus.reached')}<"); // Wait, previously it was "Hospital" and "Accident" separately, but the translation is combined or separated. "Reached" and "Hospital" in UI.
content = content.replace(/>Accident</g, ">{t('emergencyStatus.accident')}<");

fs.writeFileSync(path, content);

console.log("Patched GoogleMapsNavigationMode");
