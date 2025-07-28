declare namespace NodeJS {
  interface ProcessEnv {
    // Supabase Configuration
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;

    // EMQX Cloud MQTT Configuration
    NEXT_PUBLIC_MQTT_BROKER_URL: string;
    NEXT_PUBLIC_MQTT_BROKER_PORT: string;
    NEXT_PUBLIC_MQTT_USERNAME: string;
    NEXT_PUBLIC_MQTT_PASSWORD: string;

    // Upstash Redis Configuration
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;

    // Application Configuration
    NEXT_PUBLIC_APP_URL: string;
    NODE_ENV: 'development' | 'production' | 'test';

    // Optional
    NEXT_PUBLIC_VERCEL_ANALYTICS_ID?: string;
  }
}
