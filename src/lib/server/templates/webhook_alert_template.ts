const template =
  '{\n  "alert_id": "{{alert_id}}",\n  "alert_name": "{{alert_name}}",\n ' +
  ' "alert_for": "{{alert_for}}",\n  "alert_value": "{{alert_value}}",\n ' +
  ' "alert_status": "{{alert_status}}",\n  "alert_severity": "{{alert_severity}}",\n' +
  '  "alert_message": "{{alert_message}}",\n  "alert_source": "{{alert_source}}",\n ' +
  ' "alert_timestamp": "{{alert_timestamp}}",\n ' +
  ' "alert_cta_url": "{{alert_cta_url}}",\n ' +
  ' "alert_cta_text": "{{alert_cta_text}}",\n  ' +
  '"alert_incident_id": {{alert_incident_id}},\n  ' +
  '"alert_failure_threshold": {{alert_failure_threshold}},\n ' +
  ' "alert_success_threshold": {{alert_success_threshold}},\n  ' +
  '"is_resolved": {{is_resolved}},\n  "is_triggered": {{is_triggered}},\n  ' +
  '"site_url": "{{site_url}}",\n  "site_name": "{{site_name}}",\n ' +
  ' "site_logo_url": "{{site_logo_url}}",\n  "colors_up": "{{colors_up}}",\n  ' +
  '"colors_down": "{{colors_down}}",\n  ' +
  '"colors_degraded": "{{colors_degraded}}",\n ' +
  ' "colors_maintenance": "{{colors_maintenance}}"\n}';

export default {
  webhook_body: template,
};
