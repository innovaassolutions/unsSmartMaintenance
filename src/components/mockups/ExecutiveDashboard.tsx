'use client';

export default function ExecutiveDashboard() {
  return (
    <svg
      viewBox="0 0 800 560"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto rounded-lg shadow-2xl"
    >
      {/* Background */}
      <rect width="800" height="560" rx="8" fill="#0f1520" />

      {/* Browser Chrome */}
      <rect width="800" height="36" rx="8" fill="#1e2a3a" />
      <rect y="28" width="800" height="8" fill="#1e2a3a" />
      <circle cx="20" cy="18" r="6" fill="#ff5f57" />
      <circle cx="38" cy="18" r="6" fill="#febc2e" />
      <circle cx="56" cy="18" r="6" fill="#28c840" />
      <rect x="80" y="8" width="400" height="20" rx="4" fill="#0f1520" />
      <text x="96" y="22" fill="#64748b" fontSize="10" fontFamily="monospace">
        novapredict.innovaas.co/dashboard/executive
      </text>

      {/* Header Bar */}
      <rect x="0" y="36" width="800" height="44" fill="#1a2332" />
      <text
        x="20"
        y="64"
        fill="#F25C05"
        fontSize="16"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        NovaPRedict
      </text>
      <text x="140" y="64" fill="#94a3b8" fontSize="12" fontFamily="sans-serif">
        Executive Dashboard
      </text>
      <circle cx="740" cy="58" r="14" fill="#1e2a3a" />
      <text x="735" y="62" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
        DM
      </text>
      <circle cx="700" cy="58" r="3" fill="#28c840" />

      {/* OEE Gauge Section */}
      <rect x="20" y="96" width="240" height="200" rx="8" fill="#1a2332" />
      <text x="36" y="120" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">
        Overall Equipment Effectiveness
      </text>
      {/* Gauge arc background */}
      <path
        d="M 80 240 A 60 60 0 1 1 200 240"
        stroke="#1e2a3a"
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
      />
      {/* Gauge arc value */}
      <path
        d="M 80 240 A 60 60 0 1 1 188 210"
        stroke="#F25C05"
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
      />
      <text
        x="120"
        y="220"
        fill="#ffffff"
        fontSize="28"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        87.5
      </text>
      <text
        x="135"
        y="238"
        fill="#94a3b8"
        fontSize="10"
        fontFamily="sans-serif"
      >
        OEE %
      </text>
      <text x="36" y="278" fill="#28c840" fontSize="10" fontFamily="sans-serif">
        ▲ 2.3% vs last month
      </text>

      {/* Uptime Card */}
      <rect x="276" y="96" width="240" height="94" rx="8" fill="#1a2332" />
      <text
        x="292"
        y="120"
        fill="#94a3b8"
        fontSize="11"
        fontFamily="sans-serif"
      >
        System Uptime
      </text>
      <text
        x="292"
        y="155"
        fill="#ffffff"
        fontSize="32"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        99.7%
      </text>
      <text
        x="292"
        y="176"
        fill="#28c840"
        fontSize="10"
        fontFamily="sans-serif"
      >
        ▲ 0.4% from target
      </text>

      {/* Downtime Cost Savings */}
      <rect x="276" y="202" width="240" height="94" rx="8" fill="#1a2332" />
      <text
        x="292"
        y="226"
        fill="#94a3b8"
        fontSize="11"
        fontFamily="sans-serif"
      >
        Downtime Cost Savings
      </text>
      <text
        x="292"
        y="262"
        fill="#28c840"
        fontSize="32"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        $142K
      </text>
      <text
        x="292"
        y="282"
        fill="#94a3b8"
        fontSize="10"
        fontFamily="sans-serif"
      >
        This quarter vs. last year
      </text>

      {/* Alerts Summary */}
      <rect x="532" y="96" width="248" height="94" rx="8" fill="#1a2332" />
      <text
        x="548"
        y="120"
        fill="#94a3b8"
        fontSize="11"
        fontFamily="sans-serif"
      >
        Active Alerts
      </text>
      <text
        x="548"
        y="152"
        fill="#ff5f57"
        fontSize="24"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        3
      </text>
      <text
        x="572"
        y="152"
        fill="#94a3b8"
        fontSize="12"
        fontFamily="sans-serif"
      >
        Critical
      </text>
      <text
        x="640"
        y="152"
        fill="#febc2e"
        fontSize="24"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        7
      </text>
      <text
        x="664"
        y="152"
        fill="#94a3b8"
        fontSize="12"
        fontFamily="sans-serif"
      >
        Warning
      </text>
      <text
        x="548"
        y="176"
        fill="#64748b"
        fontSize="10"
        fontFamily="sans-serif"
      >
        2 new in last hour
      </text>

      {/* Machines Online */}
      <rect x="532" y="202" width="248" height="94" rx="8" fill="#1a2332" />
      <text
        x="548"
        y="226"
        fill="#94a3b8"
        fontSize="11"
        fontFamily="sans-serif"
      >
        Machines Online
      </text>
      <text
        x="548"
        y="262"
        fill="#ffffff"
        fontSize="32"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        47/52
      </text>
      <text
        x="548"
        y="282"
        fill="#F25C05"
        fontSize="10"
        fontFamily="sans-serif"
      >
        5 in scheduled maintenance
      </text>

      {/* Trend Chart Area */}
      <rect x="20" y="312" width="496" height="228" rx="8" fill="#1a2332" />
      <text x="36" y="338" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">
        Production Efficiency — Last 30 Days
      </text>
      {/* Chart grid lines */}
      <line
        x1="50"
        y1="360"
        x2="500"
        y2="360"
        stroke="#1e2a3a"
        strokeWidth="1"
      />
      <line
        x1="50"
        y1="390"
        x2="500"
        y2="390"
        stroke="#1e2a3a"
        strokeWidth="1"
      />
      <line
        x1="50"
        y1="420"
        x2="500"
        y2="420"
        stroke="#1e2a3a"
        strokeWidth="1"
      />
      <line
        x1="50"
        y1="450"
        x2="500"
        y2="450"
        stroke="#1e2a3a"
        strokeWidth="1"
      />
      <line
        x1="50"
        y1="480"
        x2="500"
        y2="480"
        stroke="#1e2a3a"
        strokeWidth="1"
      />
      {/* Y-axis labels */}
      <text x="36" y="364" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        100
      </text>
      <text x="40" y="394" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        90
      </text>
      <text x="40" y="424" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        80
      </text>
      <text x="40" y="454" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        70
      </text>
      <text x="40" y="484" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        60
      </text>
      {/* Trend line */}
      <polyline
        points="60,440 90,430 120,435 150,415 180,420 210,405 240,410 270,395 300,385 330,390 360,378 390,370 420,375 450,365 480,358"
        stroke="#F25C05"
        strokeWidth="2.5"
        fill="none"
        strokeLinejoin="round"
      />
      {/* Area under trend */}
      <polyline
        points="60,440 90,430 120,435 150,415 180,420 210,405 240,410 270,395 300,385 330,390 360,378 390,370 420,375 450,365 480,358 480,490 60,490"
        fill="url(#trendGrad)"
        opacity="0.3"
      />
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F25C05" />
          <stop offset="100%" stopColor="#F25C05" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* X-axis labels */}
      <text x="60" y="505" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        Jan 1
      </text>
      <text x="180" y="505" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        Jan 10
      </text>
      <text x="300" y="505" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        Jan 20
      </text>
      <text x="440" y="505" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        Jan 30
      </text>
      {/* Legend */}
      <rect x="380" y="330" width="8" height="8" rx="2" fill="#F25C05" />
      <text x="393" y="338" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        Efficiency %
      </text>

      {/* Right side panel — Prediction Summary */}
      <rect x="532" y="312" width="248" height="228" rx="8" fill="#1a2332" />
      <text
        x="548"
        y="338"
        fill="#94a3b8"
        fontSize="11"
        fontFamily="sans-serif"
      >
        Predicted Failures (Next 14 Days)
      </text>
      {/* Prediction items */}
      <rect x="548" y="352" width="216" height="36" rx="4" fill="#1e2a3a" />
      <circle cx="562" cy="370" r="5" fill="#ff5f57" />
      <text
        x="576"
        y="366"
        fill="#ffffff"
        fontSize="10"
        fontFamily="sans-serif"
      >
        CNC-003 Spindle Motor
      </text>
      <text x="576" y="380" fill="#ff5f57" fontSize="9" fontFamily="sans-serif">
        ~3 days — High confidence
      </text>

      <rect x="548" y="396" width="216" height="36" rx="4" fill="#1e2a3a" />
      <circle cx="562" cy="414" r="5" fill="#febc2e" />
      <text
        x="576"
        y="410"
        fill="#ffffff"
        fontSize="10"
        fontFamily="sans-serif"
      >
        PUMP-007 Bearing
      </text>
      <text x="576" y="424" fill="#febc2e" fontSize="9" fontFamily="sans-serif">
        ~8 days — Medium confidence
      </text>

      <rect x="548" y="440" width="216" height="36" rx="4" fill="#1e2a3a" />
      <circle cx="562" cy="458" r="5" fill="#febc2e" />
      <text
        x="576"
        y="454"
        fill="#ffffff"
        fontSize="10"
        fontFamily="sans-serif"
      >
        CONV-012 Drive Belt
      </text>
      <text x="576" y="468" fill="#febc2e" fontSize="9" fontFamily="sans-serif">
        ~12 days — Medium confidence
      </text>

      <rect x="548" y="484" width="216" height="36" rx="4" fill="#1e2a3a" />
      <circle cx="562" cy="502" r="5" fill="#28c840" />
      <text
        x="576"
        y="498"
        fill="#ffffff"
        fontSize="10"
        fontFamily="sans-serif"
      >
        ROBOT-002 Servo
      </text>
      <text x="576" y="512" fill="#28c840" fontSize="9" fontFamily="sans-serif">
        ~14 days — Low risk
      </text>
    </svg>
  );
}
