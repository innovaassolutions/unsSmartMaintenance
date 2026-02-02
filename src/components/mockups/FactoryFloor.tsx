'use client';

export default function FactoryFloor() {
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
        novapredict.innovaas.co/dashboard/factory
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
        NovaPredict
      </text>
      <text x="140" y="64" fill="#94a3b8" fontSize="12" fontFamily="sans-serif">
        Factory Floor — Assembly Line A
      </text>
      {/* Live indicator */}
      <circle cx="720" cy="58" r="4" fill="#28c840">
        <animate
          attributeName="opacity"
          values="1;0.3;1"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <text x="730" y="62" fill="#28c840" fontSize="10" fontFamily="sans-serif">
        LIVE
      </text>

      {/* Section: Machine Status Grid */}
      <text x="20" y="104" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">
        Machine Status Grid
      </text>

      {/* Row 1 */}
      <rect
        x="20"
        y="114"
        width="118"
        height="80"
        rx="6"
        fill="#1a2332"
        stroke="#28c840"
        strokeWidth="1.5"
      />
      <circle cx="36" cy="132" r="5" fill="#28c840" />
      <text
        x="46"
        y="136"
        fill="#ffffff"
        fontSize="10"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        CNC-001
      </text>
      <text x="36" y="152" fill="#28c840" fontSize="9" fontFamily="sans-serif">
        ● Running
      </text>
      <text x="36" y="166" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
        Temp: 42°C | RPM: 3200
      </text>
      <text x="36" y="180" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
        Load: 78% | Uptime: 12.4h
      </text>

      <rect
        x="148"
        y="114"
        width="118"
        height="80"
        rx="6"
        fill="#1a2332"
        stroke="#28c840"
        strokeWidth="1.5"
      />
      <circle cx="164" cy="132" r="5" fill="#28c840" />
      <text
        x="174"
        y="136"
        fill="#ffffff"
        fontSize="10"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        CNC-002
      </text>
      <text x="164" y="152" fill="#28c840" fontSize="9" fontFamily="sans-serif">
        ● Running
      </text>
      <text x="164" y="166" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
        Temp: 39°C | RPM: 2800
      </text>
      <text x="164" y="180" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
        Load: 65% | Uptime: 8.2h
      </text>

      <rect
        x="276"
        y="114"
        width="118"
        height="80"
        rx="6"
        fill="#1a2332"
        stroke="#ff5f57"
        strokeWidth="1.5"
      />
      <circle cx="292" cy="132" r="5" fill="#ff5f57">
        <animate
          attributeName="opacity"
          values="1;0.4;1"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
      <text
        x="302"
        y="136"
        fill="#ffffff"
        fontSize="10"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        CNC-003
      </text>
      <text x="292" y="152" fill="#ff5f57" fontSize="9" fontFamily="sans-serif">
        ⚠ Alert
      </text>
      <text x="292" y="166" fill="#ff5f57" fontSize="8" fontFamily="sans-serif">
        Temp: 78°C | Vibr: HIGH
      </text>
      <text x="292" y="180" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
        Load: 92% | Uptime: 6.1h
      </text>

      <rect
        x="404"
        y="114"
        width="118"
        height="80"
        rx="6"
        fill="#1a2332"
        stroke="#febc2e"
        strokeWidth="1.5"
      />
      <circle cx="420" cy="132" r="5" fill="#febc2e" />
      <text
        x="430"
        y="136"
        fill="#ffffff"
        fontSize="10"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        PUMP-007
      </text>
      <text x="420" y="152" fill="#febc2e" fontSize="9" fontFamily="sans-serif">
        ● Warning
      </text>
      <text x="420" y="166" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
        Temp: 55°C | Press: 4.2bar
      </text>
      <text x="420" y="180" fill="#febc2e" fontSize="8" fontFamily="sans-serif">
        Bearing wear detected
      </text>

      <rect
        x="532"
        y="114"
        width="118"
        height="80"
        rx="6"
        fill="#1a2332"
        stroke="#28c840"
        strokeWidth="1.5"
      />
      <circle cx="548" cy="132" r="5" fill="#28c840" />
      <text
        x="558"
        y="136"
        fill="#ffffff"
        fontSize="10"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        CONV-012
      </text>
      <text x="548" y="152" fill="#28c840" fontSize="9" fontFamily="sans-serif">
        ● Running
      </text>
      <text x="548" y="166" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
        Speed: 1.2m/s | Load: 45%
      </text>
      <text x="548" y="180" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
        Items: 2,847 today
      </text>

      <rect
        x="660"
        y="114"
        width="118"
        height="80"
        rx="6"
        fill="#1a2332"
        stroke="#64748b"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />
      <circle cx="676" cy="132" r="5" fill="#64748b" />
      <text
        x="686"
        y="136"
        fill="#ffffff"
        fontSize="10"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        ROBOT-002
      </text>
      <text x="676" y="152" fill="#64748b" fontSize="9" fontFamily="sans-serif">
        ● Maintenance
      </text>
      <text x="676" y="166" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
        Scheduled service
      </text>
      <text x="676" y="180" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
        ETA: 2h 15m
      </text>

      {/* Sensor Readings Panel */}
      <rect x="20" y="210" width="380" height="170" rx="8" fill="#1a2332" />
      <text x="36" y="234" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">
        Real-Time Sensor Readings — CNC-003
      </text>

      {/* Temperature bar */}
      <text x="36" y="258" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        Temperature
      </text>
      <rect x="130" y="248" width="200" height="14" rx="3" fill="#1e2a3a" />
      <rect x="130" y="248" width="156" height="14" rx="3" fill="#ff5f57" />
      <text
        x="340"
        y="259"
        fill="#ff5f57"
        fontSize="9"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        78°C
      </text>
      <text x="370" y="259" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        /80°C max
      </text>

      {/* Vibration bar */}
      <text x="36" y="284" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        Vibration
      </text>
      <rect x="130" y="274" width="200" height="14" rx="3" fill="#1e2a3a" />
      <rect x="130" y="274" width="170" height="14" rx="3" fill="#febc2e" />
      <text
        x="340"
        y="285"
        fill="#febc2e"
        fontSize="9"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        6.8mm/s
      </text>

      {/* Current bar */}
      <text x="36" y="310" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        Current Draw
      </text>
      <rect x="130" y="300" width="200" height="14" rx="3" fill="#1e2a3a" />
      <rect x="130" y="300" width="140" height="14" rx="3" fill="#F25C05" />
      <text
        x="340"
        y="311"
        fill="#F25C05"
        fontSize="9"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        14.2A
      </text>

      {/* Pressure bar */}
      <text x="36" y="336" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        Oil Pressure
      </text>
      <rect x="130" y="326" width="200" height="14" rx="3" fill="#1e2a3a" />
      <rect x="130" y="326" width="120" height="14" rx="3" fill="#28c840" />
      <text
        x="340"
        y="337"
        fill="#28c840"
        fontSize="9"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        4.1 bar
      </text>

      {/* Acoustic bar */}
      <text x="36" y="362" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        Acoustic dB
      </text>
      <rect x="130" y="352" width="200" height="14" rx="3" fill="#1e2a3a" />
      <rect x="130" y="352" width="150" height="14" rx="3" fill="#febc2e" />
      <text
        x="340"
        y="363"
        fill="#febc2e"
        fontSize="9"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        72 dB
      </text>

      {/* Activity Feed */}
      <rect x="416" y="210" width="364" height="170" rx="8" fill="#1a2332" />
      <text
        x="432"
        y="234"
        fill="#94a3b8"
        fontSize="11"
        fontFamily="sans-serif"
      >
        Real-Time Activity
      </text>

      <text x="432" y="258" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        10:24:03
      </text>
      <text x="492" y="258" fill="#ff5f57" fontSize="9" fontFamily="sans-serif">
        CNC-003 vibration exceeded threshold (6.8mm/s)
      </text>

      <text x="432" y="278" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        10:23:47
      </text>
      <text x="492" y="278" fill="#febc2e" fontSize="9" fontFamily="sans-serif">
        PUMP-007 bearing wear anomaly detected
      </text>

      <text x="432" y="298" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        10:22:15
      </text>
      <text x="492" y="298" fill="#28c840" fontSize="9" fontFamily="sans-serif">
        CNC-002 batch #4827 completed (250 units)
      </text>

      <text x="432" y="318" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        10:21:30
      </text>
      <text x="492" y="318" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        ROBOT-002 entered scheduled maintenance
      </text>

      <text x="432" y="338" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        10:20:44
      </text>
      <text x="492" y="338" fill="#28c840" fontSize="9" fontFamily="sans-serif">
        CONV-012 throughput target reached (2,500)
      </text>

      <text x="432" y="358" fill="#64748b" fontSize="8" fontFamily="sans-serif">
        10:19:12
      </text>
      <text x="492" y="358" fill="#F25C05" fontSize="9" fontFamily="sans-serif">
        CNC-003 temperature rising — 74°C → 78°C
      </text>

      {/* Bottom stats bar */}
      <rect x="20" y="396" width="760" height="50" rx="8" fill="#1a2332" />
      <text x="56" y="418" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        Total Machines
      </text>
      <text
        x="56"
        y="434"
        fill="#ffffff"
        fontSize="14"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        52
      </text>

      <line
        x1="150"
        y1="406"
        x2="150"
        y2="438"
        stroke="#1e2a3a"
        strokeWidth="1"
      />
      <text x="176" y="418" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        Running
      </text>
      <text
        x="176"
        y="434"
        fill="#28c840"
        fontSize="14"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        45
      </text>

      <line
        x1="260"
        y1="406"
        x2="260"
        y2="438"
        stroke="#1e2a3a"
        strokeWidth="1"
      />
      <text x="286" y="418" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        Warning
      </text>
      <text
        x="286"
        y="434"
        fill="#febc2e"
        fontSize="14"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        3
      </text>

      <line
        x1="360"
        y1="406"
        x2="360"
        y2="438"
        stroke="#1e2a3a"
        strokeWidth="1"
      />
      <text x="386" y="418" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        Critical
      </text>
      <text
        x="386"
        y="434"
        fill="#ff5f57"
        fontSize="14"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        1
      </text>

      <line
        x1="460"
        y1="406"
        x2="460"
        y2="438"
        stroke="#1e2a3a"
        strokeWidth="1"
      />
      <text x="486" y="418" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        Maintenance
      </text>
      <text
        x="486"
        y="434"
        fill="#64748b"
        fontSize="14"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        3
      </text>

      <line
        x1="590"
        y1="406"
        x2="590"
        y2="438"
        stroke="#1e2a3a"
        strokeWidth="1"
      />
      <text x="616" y="418" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        Throughput Today
      </text>
      <text
        x="616"
        y="434"
        fill="#F25C05"
        fontSize="14"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        12,847 units
      </text>

      {/* Mini sparkline chart area */}
      <rect x="20" y="462" width="760" height="80" rx="8" fill="#1a2332" />
      <text x="36" y="484" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
        CNC-003 Temperature Trend (Last 2 Hours)
      </text>
      {/* Threshold line */}
      <line
        x1="36"
        y1="496"
        x2="760"
        y2="496"
        stroke="#ff5f57"
        strokeWidth="0.5"
        strokeDasharray="4 2"
      />
      <text x="690" y="494" fill="#ff5f57" fontSize="7" fontFamily="sans-serif">
        80°C LIMIT
      </text>
      {/* Temperature trend */}
      <polyline
        points="36,528 80,526 120,524 160,522 200,518 240,515 280,510 320,506 360,504 400,502 440,500 480,499 520,498 560,497 600,497 640,497 680,496 720,496"
        stroke="#ff5f57"
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
      <polyline
        points="36,528 80,526 120,524 160,522 200,518 240,515 280,510 320,506 360,504 400,502 440,500 480,499 520,498 560,497 600,497 640,497 680,496 720,496 720,532 36,532"
        fill="#ff5f57"
        opacity="0.1"
      />
    </svg>
  );
}
