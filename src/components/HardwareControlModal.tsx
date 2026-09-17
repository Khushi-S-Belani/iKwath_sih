import React, { useState, useEffect } from 'react';
import { esp32Serial, ESP32Telemetry } from '../services/esp32Serial';
import { 
  Cpu, 
  Usb, 
  Activity, 
  Flame, 
  Droplets, 
  RotateCw, 
  Layers, 
  Volume2, 
  Power, 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Thermometer,
  Zap,
  Gauge
} from 'lucide-react';

interface HardwareControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartHardwareBrew?: () => void;
}

export const HardwareControlModal: React.FC<HardwareControlModalProps> = ({
  isOpen,
  onClose,
  onStartHardwareBrew,
}) => {
  const [isConnected, setIsConnected] = useState(esp32Serial.isConnected());
  const [isSupported, setIsSupported] = useState(false);
  const [portLabel, setPortLabel] = useState<string>('');
  const [telemetry, setTelemetry] = useState<ESP32Telemetry | null>(null);
  const [simTempActive, setSimTempActive] = useState(false);
  const [manualOffset, setManualOffset] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ds18b20' | 'telemetry' | 'actuators' | 'pinout'>('ds18b20');

  useEffect(() => {
    setIsSupported(esp32Serial.isSupported());

    const unsubConn = esp32Serial.onConnectionChange((connected, info) => {
      setIsConnected(connected);
      if (info) setPortLabel(info);
      setConnecting(false);
    });

    const unsubTelem = esp32Serial.onTelemetry((data) => {
      setTelemetry(data);
      setSimTempActive(data.sim_mode);
    });

    return () => {
      unsubConn();
      unsubTelem();
    };
  }, []);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setErrorMsg(null);
    setConnecting(true);
    try {
      await esp32Serial.connect();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect to ESP32 serial port.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await esp32Serial.disconnect();
    setTelemetry(null);
  };

  const handleToggleSim = async () => {
    await esp32Serial.toggleTempSimulation();
    setSimTempActive(!simTempActive);
  };

  const currentTemp = (telemetry ? telemetry.temp_c : 25.4) + manualOffset;
  const currentTempF = (currentTemp * 9) / 5 + 32;

  const getThermalStatus = (t: number) => {
    if (t < 28) return { label: 'Ambient / Room Temp', color: 'text-sky-400', bg: 'bg-sky-500/20 border-sky-500/30' };
    if (t < 45) return { label: 'Warm / Body Heat Detected 🔥', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' };
    if (t < 75) return { label: 'Gentle Warm Water', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' };
    if (t < 92) return { label: 'Decoction Extraction Range 🌿', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' };
    return { label: 'Active Rolling Boil (100°C) ☕', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/30' };
  };

  const thermal = getThermalStatus(currentTemp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                ESP32 Hardware & DS18B20 Controller
                {isConnected && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    LIVE 115200 BAUD
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">DS18B20 Temp Probe · Actuator Drivers · Flow Meter · Dual Simulation</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6">
          <button
            onClick={() => setActiveTab('ds18b20')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'ds18b20' 
                ? 'border-orange-500 text-orange-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Thermometer className="w-4 h-4" /> DS18B20 Temp Probe
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'telemetry' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" /> System Telemetry
          </button>
          <button
            onClick={() => setActiveTab('actuators')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'actuators' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCw className="w-4 h-4" /> Actuator Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('pinout')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'pinout' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Usb className="w-4 h-4" /> Wiring Schematics
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Connection Status Card */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]' : 'bg-rose-500'}`} />
              <div>
                <div className="text-sm font-semibold text-white">
                  {isConnected ? (portLabel || 'ESP32 Connected via USB Serial') : 'ESP32 Disconnected'}
                </div>
                <div className="text-xs text-slate-400">
                  {isConnected 
                    ? 'Streaming real-time DS18B20 temperature & actuator signals.' 
                    : 'Connect ESP32 to PC via USB cable and click Connect.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-lg hover:bg-rose-500/30 transition-all"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2 disabled:opacity-50"
                >
                  <Usb className="w-4 h-4" />
                  {connecting ? 'Connecting...' : 'Connect ESP32 (USB Serial)'}
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 0: DS18B20 SPECIALIZED PROBE VIEW */}
          {activeTab === 'ds18b20' && (
            <div className="space-y-4">
              
              {/* Main Temperature Display & Gauge */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/40 border border-orange-500/30 space-y-4">
                
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
                    <Thermometer className="w-4 h-4 text-orange-400 animate-pulse" />
                    DS18B20 OneWire Temperature Probe (GPIO 19)
                  </div>
                  
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${thermal.bg} ${thermal.color}`}>
                    {thermal.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline gap-6 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white tracking-tight">
                      {currentTemp.toFixed(1)}
                    </span>
                    <span className="text-2xl font-bold text-orange-400">°C</span>
                  </div>

                  <div className="text-xl font-semibold text-slate-400">
                    ({currentTempF.toFixed(1)} °F)
                  </div>

                  <div className="ml-auto text-right">
                    <div className="text-xs text-slate-400">Mode Source:</div>
                    <div className="text-sm font-bold text-emerald-400">
                      {simTempActive ? '⚡ Dynamic Simulation Engine' : '📡 Physical DS18B20 Sensor'}
                    </div>
                  </div>
                </div>

                {/* Progress Visualizer Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0°C (Freeze)</span>
                    <span>25°C (Ambient)</span>
                    <span>37°C (Body Heat)</span>
                    <span>85°C (Extract)</span>
                    <span>100°C (Boil)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div 
                      className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-sky-500 via-emerald-400 via-amber-400 to-rose-500 shadow-[0_0_12px_#f97316]"
                      style={{ width: `${Math.min(100, Math.max(0, (currentTemp / 100) * 100))}%` }}
                    />
                  </div>
                </div>

              </div>

              {/* No Lighter / Test Options Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* How to test without lighter */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    How to Test DS18B20 without a Lighter:
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
                    <li>
                      <strong className="text-emerald-300">Body Heat Test:</strong> Pinch and hold the metal sensor probe firmly between your fingers. You will see the temperature rise from <strong>~24°C $\rightarrow$ ~34°C</strong>!
                    </li>
                    <li>
                      <strong className="text-sky-300">Warm Water Cup:</strong> Dip the waterproof probe in a cup of warm water to test higher ranges (50°C–70°C).
                    </li>
                    <li>
                      <strong className="text-amber-300">Simulation Mode:</strong> Toggle software simulation below to simulate the full <strong>25°C $\rightarrow$ 90°C</strong> heating curve automatically!
                    </li>
                  </ul>
                </div>

                {/* Simulation & Manual Offsets */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-400" />
                      Thermal Simulation & Controls
                    </span>
                    <button
                      onClick={handleToggleSim}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        simTempActive 
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm' 
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {simTempActive ? 'Mode: SIMULATED' : 'Mode: LIVE PROBE'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">
                    Inject temperature changes to verify UI decoction thresholds in real time:
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => setManualOffset((p) => p + 5)}
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 text-orange-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                    >
                      +5°C Warm
                    </button>
                    <button
                      onClick={() => setManualOffset((p) => Math.max(-20, p - 5))}
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                    >
                      -5°C Cool
                    </button>
                    <button
                      onClick={() => setManualOffset(0)}
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                    >
                      Reset (0°C)
                    </button>
                  </div>
                </div>

              </div>

              {/* Standalone Diagnostic Tool Note */}
              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Standalone Quick Test Sketch: <code className="text-emerald-300">firmware/ds18b20_quick_test.ino</code></span>
                </div>
                <span className="text-slate-500">OneWire Pin: GPIO 19 + 4.7kΩ Pullup</span>
              </div>

            </div>
          )}

          {/* TAB 1: FULL TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              
              {/* Live Metric Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Temp */}
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>DS18B20 Temp</span>
                    <Flame className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {currentTemp.toFixed(1)} <span className="text-sm font-normal text-slate-400">°C</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium">
                    {simTempActive ? 'Simulated Heating Curve' : 'DS18B20 Live Probe'}
                  </div>
                </div>

                {/* Flow / Water */}
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Flow Sensor (6mm)</span>
                    <Droplets className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {telemetry ? telemetry.water_ml.toFixed(0) : '0'} <span className="text-sm font-normal text-slate-400">mL</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Target: {telemetry ? telemetry.target_water_ml : '400'} mL
                  </div>
                </div>

                {/* Machine Phase */}
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Decoction Phase</span>
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-lg font-bold text-emerald-400 truncate">
                    {telemetry ? telemetry.phase : 'IDLE'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Elapsed: {telemetry ? telemetry.elapsed_sec : '0'}s
                  </div>
                </div>

                {/* Stirrer Servo */}
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Stirrer Servo 1</span>
                    <RotateCw className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {telemetry ? telemetry.stirrer_deg : '30'} <span className="text-sm font-normal text-slate-400">°</span>
                  </div>
                  <div className="text-[10px] text-purple-400 font-medium">
                    {telemetry?.stirrer === 'ACTIVE' ? 'Agitating (30°-150°)' : 'Parked'}
                  </div>
                </div>
              </div>

              {/* Actuator Status Badges */}
              <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="text-xs font-semibold text-slate-300">Live Hardware Actuator States</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    telemetry?.heater === 'ACTIVE' 
                      ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' 
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <span>Heater Relay (GPIO 27)</span>
                    <span className="font-bold">{telemetry?.heater || 'OFF'}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    telemetry?.pump === 'ACTIVE' 
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' 
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <span>Pump (GPIO 26)</span>
                    <span className="font-bold">{telemetry?.pump || 'OFF'}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    telemetry?.stirrer === 'ACTIVE' 
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' 
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <span>Stirrer (GPIO 13)</span>
                    <span className="font-bold">{telemetry?.stirrer || 'OFF'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-slate-900 border-slate-800 text-slate-400 flex items-center justify-between">
                    <span>Button (GPIO 4)</span>
                    <span className="font-bold text-emerald-400">READY</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTUATOR DIAGNOSTICS & MANUAL TESTING */}
          {activeTab === 'actuators' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Trigger manual actions on your connected hardware to verify wiring and physical operation:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Start Hardware Brew Sequence */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Play className="w-4 h-4 text-emerald-400" /> Full 11-Step Automated Decoction
                  </div>
                  <p className="text-xs text-slate-400">Runs full sequence: Pod Drop $\rightarrow$ Water Pump $\rightarrow$ Heat $\rightarrow$ Stir $\rightarrow$ Filter $\rightarrow$ Dispense.</p>
                  <button
                    onClick={() => {
                      esp32Serial.startBrew(400);
                      if (onStartHardwareBrew) onStartHardwareBrew();
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-emerald-950"
                  >
                    Start Automated Hardware Brew
                  </button>
                </div>

                {/* Emergency Stop */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Square className="w-4 h-4 text-rose-400" /> Stop / Reset Actuators
                  </div>
                  <p className="text-xs text-slate-400">Instantly turns off heater relay, shuts down pump, and parks both servos.</p>
                  <button
                    onClick={() => esp32Serial.stopBrew()}
                    className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition-all"
                  >
                    Stop Hardware / Reset to IDLE
                  </button>
                </div>

                {/* Test Peristaltic Pump */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-sky-400" /> Peristaltic Pump (GPIO 26)
                  </div>
                  <p className="text-xs text-slate-400">Toggles 12V/5V DC Pump MOSFET to test water suction & tubing flow.</p>
                  <button
                    onClick={() => esp32Serial.testPump()}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    Toggle Peristaltic Pump ON/OFF
                  </button>
                </div>

                {/* Test Stirrer Servo */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <RotateCw className="w-4 h-4 text-purple-400" /> Stirrer Servo 1 (GPIO 13)
                  </div>
                  <p className="text-xs text-slate-400">Starts/stops 30° $\leftrightarrow$ 150° continuous oscillation agitator in vessel.</p>
                  <button
                    onClick={() => esp32Serial.testStirrer()}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    Toggle Stirrer Oscillation
                  </button>
                </div>

                {/* Test Pod Drop Flap Servo */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" /> Pod Dispenser Servo 2 (GPIO 14)
                  </div>
                  <p className="text-xs text-slate-400">Rotates pod drop flap 90° for 1.5s, then returns to 0° home position.</p>
                  <button
                    onClick={() => esp32Serial.testPodFlap()}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    Test Pod Drop Sweep (0° $\rightarrow$ 90° $\rightarrow$ 0°)
                  </button>
                </div>

                {/* Test Heater Relay */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" /> Heater Relay (GPIO 27)
                  </div>
                  <p className="text-xs text-slate-400">Toggles 5V Relay coil (clicks relay to test heating load circuit).</p>
                  <button
                    onClick={() => esp32Serial.testRelay()}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-orange-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    Toggle Heater Relay ON/OFF
                  </button>
                </div>

                {/* Test Buzzer */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-teal-400" /> Active Buzzer (GPIO 25)
                  </div>
                  <p className="text-xs text-slate-400">Plays dual-beep audio notification chime on piezo buzzer.</p>
                  <button
                    onClick={() => esp32Serial.testBuzzer()}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    Beep Buzzer
                  </button>
                </div>

                {/* Test Cleaning Cycle */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-400" /> Automatic Flush & Cleaning
                  </div>
                  <p className="text-xs text-slate-400">Runs high-flow pump flush with stirrer rinse for 10 seconds.</p>
                  <button
                    onClick={() => esp32Serial.startCleaning()}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    Run Flush & Cleaning Routine
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: PINOUT & WIRING */}
          {activeTab === 'pinout' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="font-bold text-sm text-white">ESP32 Pinout & Connection Table</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-3">Component</th>
                        <th className="py-2 px-3">ESP32 Pin</th>
                        <th className="py-2 px-3">Power Rail</th>
                        <th className="py-2 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">DS18B20 Temp</td>
                        <td className="py-2 px-3 text-orange-400 font-mono">GPIO 19</td>
                        <td className="py-2 px-3">3.3V / 5V</td>
                        <td className="py-2 px-3 text-slate-400">Requires 4.7kΩ resistor between Data & 3.3V.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">Push Button</td>
                        <td className="py-2 px-3 text-emerald-400 font-mono">GPIO 4</td>
                        <td className="py-2 px-3">GND</td>
                        <td className="py-2 px-3 text-slate-400">Internal pull-up. Button connects GPIO 4 to GND.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">Peristaltic Pump</td>
                        <td className="py-2 px-3 text-sky-400 font-mono">GPIO 26</td>
                        <td className="py-2 px-3">Ext 12V/5V</td>
                        <td className="py-2 px-3 text-slate-400">Driven via MOSFET (IRF520) or Relay Ch 1.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">Flow Sensor (6mm)</td>
                        <td className="py-2 px-3 text-sky-400 font-mono">GPIO 18</td>
                        <td className="py-2 px-3">5V / 3.3V</td>
                        <td className="py-2 px-3 text-slate-400">Interrupt pin counts water pulses (5.88 pulses/mL).</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">Servo 1 (Stirrer)</td>
                        <td className="py-2 px-3 text-purple-400 font-mono">GPIO 13</td>
                        <td className="py-2 px-3">Ext 5V</td>
                        <td className="py-2 px-3 text-slate-400">Oscillates 30° $\leftrightarrow$ 150° during decoction.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">Servo 2 (Pod Flap)</td>
                        <td className="py-2 px-3 text-amber-400 font-mono">GPIO 14</td>
                        <td className="py-2 px-3">Ext 5V</td>
                        <td className="py-2 px-3 text-slate-400">Rotates 0° $\leftrightarrow$ 90° to dispense herbal pod.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">Heater Relay</td>
                        <td className="py-2 px-3 text-orange-400 font-mono">GPIO 27</td>
                        <td className="py-2 px-3">5V (Vin)</td>
                        <td className="py-2 px-3 text-slate-400">Active LOW relay triggers heater element.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">Active Buzzer</td>
                        <td className="py-2 px-3 text-teal-400 font-mono">GPIO 25</td>
                        <td className="py-2 px-3">GND</td>
                        <td className="py-2 px-3 text-slate-400">Beeps on Start, Step changes, and Alerts.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Firmware: <code className="text-emerald-400">firmware/ikwath_esp32_firmware.ino</code></span>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
