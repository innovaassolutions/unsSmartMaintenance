# EMQX Cloud Setup Guide

This guide walks you through setting up an EMQX Cloud MQTT broker for the UNS Demo System.

## Overview

EMQX Cloud is a managed MQTT service that provides enterprise-grade message brokering for IoT applications. For the UNS Demo System, we'll use it to handle real-time data streaming from simulated CNC machines to the dashboard.

## Step 1: Create EMQX Cloud Account

1. Go to [EMQX Cloud Console](https://console.emqxcloud.com/)
2. Sign up for a new account or sign in if you already have one
3. Complete email verification if required

## Step 2: Create a New Deployment

1. Click **"New Deployment"** on the dashboard
2. Choose deployment type:
   - **Serverless**: Free tier, good for development and testing
   - **Dedicated**: Production-ready with guaranteed resources
   - **BYOC**: Bring Your Own Cloud (advanced)

### For Development (Recommended for this demo):
- Select **Serverless**
- Choose a region close to your location
- Deployment will be created automatically

### For Production:
- Select **Dedicated** 
- Choose specifications based on your needs:
  - **Basic**: 1,000 connections, 1,000 TPS
  - **Professional**: 5,000 connections, 5,000 TPS
  - **Enterprise**: 10,000+ connections, 10,000+ TPS
- Select cloud provider (AWS, Google Cloud, Azure)
- Choose region

## Step 3: Configure Broker Settings

After deployment creation:

1. **Access Deployment Details**
   - Click on your deployment name
   - Note the **Connection Address** (this will be your MQTT_BROKER_HOST)

2. **Connection Ports**
   - MQTT: 1883 (non-TLS)
   - MQTTS: 8883 (TLS/SSL)
   - WebSocket: 8083 (non-TLS)
   - WebSocket Secure: 8084 (TLS/SSL)

## Step 4: Set Up Authentication

1. Go to **Authentication & ACL** → **Authentication**
2. Create authentication credentials:
   - **Username**: Create a username for CNC machine connections
   - **Password**: Create a strong password
   - **Client ID**: Leave blank or use pattern like `cnc_machine_*`

3. Create separate credentials for dashboard:
   - **Username**: `dashboard-user` (or similar)
   - **Password**: Create a different strong password
   - **Client ID**: Use pattern like `dashboard_*`

## Step 5: Configure Access Control Lists (ACLs)

1. Go to **Authentication & ACL** → **Authorization**
2. Set up topic permissions:

### For CNC Machines:
```
# Allow publishing to UNS hierarchy
Factory01/+/+/+/+: pub

# Example specific permissions:
Factory01/Line1/Machine01/#: pub
Factory01/Line1/Machine02/#: pub
```

### For Dashboard:
```
# Allow subscribing to all factory data
Factory01/#: sub

# Allow publishing commands (optional)
Factory01/+/+/Commands: pub
```

## Step 6: Enable TLS/SSL (Recommended)

1. Go to **TLS/SSL** settings
2. **Server-side TLS** should be enabled by default
3. For additional security, you can:
   - Upload custom CA certificates
   - Enable mutual TLS authentication
   - Configure client certificates

## Step 7: Set Up Data Integration (Optional)

For advanced data processing:

1. Go to **Data Integration** → **Rules**
2. Create rules to:
   - Forward data to external databases
   - Transform message formats
   - Trigger webhooks on specific events

Example rule for webhook integration:
```sql
SELECT 
  topic,
  payload,
  timestamp
FROM 
  "Factory01/+/+/+/Telemetry"
```

## Step 8: Configure Environment Variables

Update your `.env.local` file with the broker details:

```bash
# EMQX Cloud Basic Configuration
MQTT_BROKER_HOST=your-broker-id.emqxsl.com
MQTT_BROKER_PORT=8883
MQTT_PROTOCOL=mqtts
MQTT_USERNAME=your-cnc-username
MQTT_PASSWORD=your-cnc-password

# WebSocket Configuration for Dashboard
NEXT_PUBLIC_MQTT_WS_HOST=your-broker-id.emqxsl.com
NEXT_PUBLIC_MQTT_WS_PORT=8084
NEXT_PUBLIC_MQTT_WS_PATH=/mqtt
NEXT_PUBLIC_MQTT_WS_USERNAME=dashboard-user
NEXT_PUBLIC_MQTT_WS_PASSWORD=dashboard-password

# TLS/SSL Configuration
MQTT_TLS_ENABLED=true
MQTT_TLS_REJECT_UNAUTHORIZED=true
```

## Step 9: Test Connection

Use the built-in connection test utility:

```typescript
import { getMQTTConfig } from '@/lib/mqtt/config';

const config = getMQTTConfig();
const result = await config.validateBrokerConnectivity();

if (result.success) {
  console.log('MQTT broker connection successful!');
} else {
  console.error('Connection failed:', result.error);
}
```

## Step 10: Monitor and Debug

1. **EMQX Console Monitoring**:
   - Go to **Monitoring** tab
   - View real-time connection counts
   - Monitor message throughput
   - Check for connection errors

2. **Logs and Metrics**:
   - **Logs** tab shows connection attempts and errors
   - **Metrics** tab provides detailed performance data
   - Set up alerts for critical thresholds

## Security Best Practices

1. **Use Strong Passwords**: Generate random, complex passwords
2. **Enable TLS/SSL**: Always use encrypted connections in production
3. **Restrict ACLs**: Give minimal necessary permissions
4. **Regular Rotation**: Rotate credentials periodically
5. **Monitor Access**: Review connection logs regularly
6. **Firewall Rules**: Restrict access to known IP ranges if possible

## Troubleshooting

### Common Connection Issues:

1. **Connection Refused**:
   - Check broker hostname and port
   - Verify deployment is running
   - Check firewall settings

2. **Authentication Failed**:
   - Verify username/password
   - Check ACL permissions
   - Ensure client ID patterns match

3. **TLS/SSL Errors**:
   - Verify certificate validity
   - Check TLS version compatibility
   - Ensure proper certificate chain

4. **WebSocket Issues**:
   - Verify WebSocket path (`/mqtt`)
   - Check CORS settings
   - Ensure WebSocket port is accessible

### Getting Help:

- EMQX Cloud Documentation: https://docs.emqx.com/en/cloud/latest/
- Support Portal: Available in EMQX Cloud console
- Community Forum: https://askemq.com/

## Costs and Billing

### Serverless Pricing:
- Free tier: 1M session minutes/month
- Additional usage: Pay-as-you-go
- No upfront costs or minimum fees

### Dedicated Pricing:
- Fixed monthly cost based on specifications
- Includes guaranteed resources
- 24/7 support available

Review pricing details at: https://www.emqx.com/en/cloud/pricing

---

This setup provides a robust, scalable MQTT infrastructure for the UNS Demo System, capable of handling real-time data from multiple CNC machines while maintaining security and reliability standards.