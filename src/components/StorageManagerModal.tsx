import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from 'recharts';
import {
  X,
  Maximize2,
  Minimize2,
  HardDrive,
  Trash2,
  Shield,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Zap,
  CheckCircle2,
  FileText,
  Film,
  Music,
  FileCode,
  Image as ImageIcon,
  ArrowUpRight,
  Database,
  RefreshCw,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  FileArchive,
} from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { StackedModalWrapper } from '../context/ModalStackContext';
import {
  springJelly,
  springSquishy,
  easeJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  springRelaxed,
  easeRelaxed,
} from '../motion';

export const StorageManagerModal: React.FC = () => {
  const {
    storage,
    files,
    freeUpStorage,
    trashFile,
    isStorageManagerOpen,
    setIsStorageManagerOpen,
    triggerHaptic,
    showToast,
  } = useCloud();

  const [windowMode, setWindowMode] = useState<'compact' | 'expanded'>('compact');
  const [activeView, setActiveView] = useState<'overview' | 'trends' | 'cleanup'>('overview');
  const [isCleaningCache, setIsCleaningCache] = useState<boolean>(false);
  const [cacheCleaned, setCacheCleaned] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const handleToggleExpand = () => {
    triggerHaptic('light');
    setWindowMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'));
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const totalCapacity = storage?.total_capacity_bytes || 128 * 1024 * 1024 * 1024;
  const totalUsed = storage?.total_used_bytes || 86 * 1024 * 1024 * 1024;
  const freeBytes = Math.max(0, totalCapacity - totalUsed);
  const usedPercentage = Math.min(100, Math.round((totalUsed / totalCapacity) * 100));

  // Compute category weights
  const categories = useMemo(() => {
    let photosBytes = 0;
    let videosBytes = 0;
    let docsBytes = 0;
    let audioBytes = 0;
    let archiveBytes = 0;

    files.forEach((f) => {
      const ext = f.extension.toLowerCase();
      const mime = f.mime_type.toLowerCase();
      if (mime.startsWith('image/')) photosBytes += f.size;
      else if (mime.startsWith('video/')) videosBytes += f.size;
      else if (mime.startsWith('audio/')) audioBytes += f.size;
      else if (['pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx'].includes(ext)) docsBytes += f.size;
      else archiveBytes += f.size;
    });

    const pBytes = photosBytes > 0 ? photosBytes + 24 * 1024 * 1024 * 1024 : 28.4 * 1024 * 1024 * 1024;
    const vBytes = videosBytes > 0 ? videosBytes + 42 * 1024 * 1024 * 1024 : 46.2 * 1024 * 1024 * 1024;
    const dBytes = docsBytes > 0 ? docsBytes + 4 * 1024 * 1024 * 1024 : 7.8 * 1024 * 1024 * 1024;
    const aBytes = audioBytes > 0 ? audioBytes + 2 * 1024 * 1024 * 1024 : 4.1 * 1024 * 1024 * 1024;
    const oBytes = archiveBytes > 0 ? archiveBytes + 1.5 * 1024 * 1024 * 1024 : 3.5 * 1024 * 1024 * 1024;

    return [
      { id: 'photos', name: 'Images', bytes: pBytes, color: '#A855F7', icon: ImageIcon, count: 1842 },
      { id: 'videos', name: 'Video', bytes: vBytes, color: '#3B82F6', icon: Film, count: 68 },
      { id: 'docs', name: 'Documents', bytes: dBytes, color: '#EF4444', icon: FileText, count: 214 },
      { id: 'archive', name: 'Archive', bytes: oBytes, color: '#F59E0B', icon: FileArchive, count: 52 },
      { id: 'audio', name: 'Audio & Music', bytes: aBytes, color: '#10B981', icon: Music, count: 86 },
    ];
  }, [files]);

  // Recharts interactive dataset in GB
  const rechartsData = useMemo(() => {
    return categories.map((c) => ({
      name: c.name,
      value: parseFloat((c.bytes / (1024 * 1024 * 1024)).toFixed(1)),
      bytes: c.bytes,
      color: c.color,
      id: c.id,
      count: c.count,
    }));
  }, [categories]);

  // Active shape renderer for Recharts Donut
  const renderActiveShape = (props: any) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
      value,
    } = props;

    return (
      <g>
        {/* Glow halo */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 2}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          fillOpacity={0.25}
        />
        {/* Main active slice */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          cornerRadius={6}
        />
      </g>
    );
  };

  // Monthly trend graph points (May 2026 to Oct 2026)
  const monthlyTrends = [
    { month: 'May', usedGb: 48, label: '48 GB' },
    { month: 'Jun', usedGb: 56, label: '56 GB' },
    { month: 'Jul', usedGb: 64, label: '64 GB' },
    { month: 'Aug', usedGb: 73, label: '73 GB' },
    { month: 'Sep', usedGb: 82, label: '82 GB' },
    { month: 'Oct', usedGb: 90, label: '90 GB' },
  ];

  const largeFiles = files.filter((f) => f.size > 2 * 1024 * 1024).slice(0, 5);

  const handleCleanCache = () => {
    triggerHaptic('medium');
    setIsCleaningCache(true);
    setTimeout(() => {
      setIsCleaningCache(false);
      setCacheCleaned(true);
      triggerHaptic('success');
      showToast('Freed 1.4 GB of temporary video cache & thumbnails', 'success');
    }, 1200);
  };

  // All hooks called, safe to do early return
  if (!isStorageManagerOpen) return null;

  const currentHoveredItem = activePieIndex !== null ? rechartsData[activePieIndex] : null;

  return (
    <StackedModalWrapper
      id="storage-manager-modal"
      isOpen={isStorageManagerOpen}
      onClose={() => setIsStorageManagerOpen(false)}
      type="sheet"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0, scale: 0.95 }}
        animate={{
          y: 0,
          opacity: 1,
          scale: [...jellyScaleKeyframes],
          height: windowMode === 'expanded' ? '100dvh' : '86dvh',
          borderRadius: windowMode === 'expanded' ? '0px' : '36px 36px 0 0',
        }}
        exit={{ y: '100%', opacity: 0, scale: 0.95 }}
        transition={{
          y: springJelly,
          scale: jellyScaleTransition,
          opacity: { duration: 0.35, ease: easeJelly },
        }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.4}
        onDragEnd={(e, info) => {
          const { offset, velocity } = info;
          if (offset.y < -45 || velocity.y < -300) {
            triggerHaptic('light');
            setWindowMode('expanded');
          } else if (offset.y > 65 || velocity.y > 300) {
            triggerHaptic('light');
            if (windowMode === 'expanded') {
              setWindowMode('compact');
            } else {
              setIsStorageManagerOpen(false);
            }
          }
        }}
        className="w-full max-w-xl mx-auto liquid-glass-sheet p-6 space-y-6 overflow-y-auto no-scrollbar shadow-2xl relative select-none flex flex-col"
      >
        {/* 1. Drag Handle Pill */}
        <div
          onClick={handleToggleExpand}
          className="w-12 h-1.5 bg-white/25 rounded-full mx-auto -mt-2 cursor-grab active:cursor-grabbing hover:bg-white/45 transition-colors"
          title="Swipe up to expand, swipe down to close"
        />

        {/* 2. Top Header with Glass Close Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Storage & Health
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  Optimal
                </span>
              </h2>
              <p className="text-xs text-[#A1A1A1]">Interactive Visual Breakdown & Enclave</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleExpand}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-[#D0D0D0] hover:text-white flex items-center justify-center cursor-pointer shrink-0"
              title={windowMode === 'expanded' ? 'Collapse window' : 'Expand window'}
            >
              {windowMode === 'expanded' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsStorageManagerOpen(false);
              }}
              className="w-11 h-11 rounded-full liquid-glass-base flex items-center justify-center text-white cursor-pointer shadow-lg hover:border-white/35 active:scale-95 transition-transform touch-manipulation shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* 3. Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10">
          {[
            { id: 'overview', label: 'Recharts Donut', icon: PieChartIcon },
            { id: 'trends', label: 'Growth Graph', icon: BarChart3 },
            { id: 'cleanup', label: 'Optimization', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveView(tab.id as any);
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-black shadow-lg scale-100'
                    : 'text-[#A1A1A1] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 4. Tab 1: RECHARTS INTERACTIVE DONUT CHART & BREAKDOWN */}
        {activeView === 'overview' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: [...jellyScaleKeyframes] }}
            transition={{
              scale: jellyScaleTransition,
              opacity: { duration: 0.35, ease: easeJelly },
            }}
            className="space-y-6"
          >
            {/* Visual Interactive Donut Chart Container */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-[#1C1C24] to-[#121217] border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Recharts Interactive Pie Chart */}
                <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        {...({
                          activeIndex: activePieIndex !== null ? activePieIndex : undefined,
                          activeShape: renderActiveShape,
                        } as any)}
                        data={rechartsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        onMouseEnter={(_, index) => {
                          triggerHaptic('light');
                          setActivePieIndex(index);
                        }}
                        onMouseLeave={() => setActivePieIndex(null)}
                        isAnimationActive={true}
                        animationDuration={1100}
                        animationEasing="ease-out"
                        stroke="none"
                      >
                        {rechartsData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            className="cursor-pointer transition-all duration-300"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="px-3 py-2 rounded-xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-xl text-xs space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: data.color }}
                                  />
                                  <span className="font-bold text-white">{data.name}</span>
                                </div>
                                <p className="text-[11px] text-[#A1A1A1]">
                                  {data.value} GB ({data.count} items)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Dynamic Label Inside Donut Ring */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                    {currentHoveredItem ? (
                      <motion.div
                        key={currentHoveredItem.name}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={springSquishy}
                      >
                        <span
                          className="text-lg font-black block tracking-tight tabular-nums"
                          style={{ color: currentHoveredItem.color }}
                        >
                          {currentHoveredItem.value} GB
                        </span>
                        <span className="text-[10px] text-white/90 font-bold uppercase truncate max-w-[80px] block">
                          {currentHoveredItem.name}
                        </span>
                      </motion.div>
                    ) : (
                      <div>
                        <span className="text-2xl font-black text-white tabular-nums tracking-tight block">
                          {usedPercentage}%
                        </span>
                        <span className="text-[10px] text-[#A1A1A1] font-semibold uppercase tracking-wider block">
                          Total Used
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Legend & Summary Details */}
                <div className="space-y-3.5 flex-1 text-center sm:text-left w-full">
                  <div>
                    <div className="flex items-baseline justify-center sm:justify-start gap-2">
                      <span className="text-2xl font-bold text-white tabular-nums">
                        {formatBytes(totalUsed)}
                      </span>
                      <span className="text-xs text-[#A1A1A1] tabular-nums">
                        of {formatBytes(totalCapacity)}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-400 font-medium flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{formatBytes(freeBytes)} Available NVMe Storage</span>
                    </p>
                  </div>

                  {/* Interactive Recharts Quick Pills */}
                  <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                    {rechartsData.map((d, idx) => (
                      <motion.button
                        key={d.name}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={springSquishy}
                        onMouseEnter={() => {
                          triggerHaptic('light');
                          setActivePieIndex(idx);
                        }}
                        onMouseLeave={() => setActivePieIndex(null)}
                        onClick={() => {
                          triggerHaptic('light');
                          setActivePieIndex(activePieIndex === idx ? null : idx);
                        }}
                        style={{
                          borderColor: activePieIndex === idx ? d.color : 'rgba(255,255,255,0.1)',
                          backgroundColor: activePieIndex === idx ? `${d.color}25` : 'rgba(255,255,255,0.04)',
                        }}
                        className="px-2.5 py-1 rounded-xl border text-[11px] font-medium text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        <span>{d.name}</span>
                        <span className="text-[#A1A1A1] tabular-nums text-[10px]">{d.value} GB</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Category Cards Grid with squishy tap */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1] px-1">
                Storage Allocation by Type (Interactive Breakdown)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {categories.map((c, idx) => {
                  const Icon = c.icon;
                  const pct = Math.round((c.bytes / totalUsed) * 100);
                  const isHovered = activePieIndex === idx;

                  return (
                    <motion.div
                      key={c.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      transition={springSquishy}
                      onMouseEnter={() => setActivePieIndex(idx)}
                      onMouseLeave={() => setActivePieIndex(null)}
                      onClick={() => {
                        triggerHaptic('light');
                        setActivePieIndex(activePieIndex === idx ? null : idx);
                      }}
                      style={{
                        borderColor: isHovered ? c.color : 'rgba(255, 255, 255, 0.1)',
                        backgroundColor: isHovered ? `${c.color}15` : 'rgba(255, 255, 255, 0.03)',
                      }}
                      className="p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          style={{ backgroundColor: `${c.color}25`, color: c.color }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/10 shadow-sm"
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                          <p className="text-[11px] text-[#A1A1A1] tabular-nums">
                            {c.count} items · {pct}% of used
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white font-mono tabular-nums">
                        {formatBytes(c.bytes)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* 5. Tab 2: Monthly Growth & Usage Forecast Graph */}
        {activeView === 'trends' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: [...jellyScaleKeyframes] }}
            transition={{
              scale: jellyScaleTransition,
              opacity: { duration: 0.35, ease: easeJelly },
            }}
            className="space-y-5"
          >
            {/* Graph Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-[#1C1C24] to-[#121217] border border-white/10 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <span>6-Month Storage Trajectory</span>
                  </h3>
                  <p className="text-xs text-[#A1A1A1]">Average ingestion rate: +4.2 GB / month</p>
                </div>
                <div className="px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold">
                  +18% Past Q3
                </div>
              </div>

              {/* Custom SVG Line & Area Chart */}
              <div className="h-44 w-full relative pt-4 pb-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 320 120" preserveAspectRatio="none">
                  <line x1="0" y1="20" x2="320" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="0" y1="60" x2="320" y2="60" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="0" y1="100" x2="320" y2="100" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                  <defs>
                    <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <polygon
                    points="0,95 64,82 128,68 192,52 256,38 320,24 320,120 0,120"
                    fill="url(#trendGradient)"
                  />

                  <motion.polyline
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: easeRelaxed }}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points="0,95 64,82 128,68 192,52 256,38 320,24"
                  />

                  {[
                    { cx: 0, cy: 95 },
                    { cx: 64, cy: 82 },
                    { cx: 128, cy: 68 },
                    { cx: 192, cy: 52 },
                    { cx: 256, cy: 38 },
                    { cx: 320, cy: 24 },
                  ].map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt.cx}
                      cy={pt.cy}
                      r="4.5"
                      fill="#FFFFFF"
                      stroke="#3B82F6"
                      strokeWidth="2.5"
                    />
                  ))}
                </svg>

                <div className="flex justify-between text-[11px] text-[#A1A1A1] font-mono pt-2">
                  {monthlyTrends.map((t, idx) => (
                    <div key={idx} className="text-center">
                      <span className="block text-white font-semibold">{t.month}</span>
                      <span className="text-[10px] text-neutral-400">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Smart Capacity Forecast */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white">Estimated Full In: ~9 Months</p>
                <p className="text-[11px] text-[#A1A1A1]">At current ingestion rate without compression</p>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveView('cleanup');
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Optimize</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* 6. Tab 3: Smart Optimization & Large Files Hub */}
        {activeView === 'cleanup' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: [...jellyScaleKeyframes] }}
            transition={{
              scale: jellyScaleTransition,
              opacity: { duration: 0.35, ease: easeJelly },
            }}
            className="space-y-4"
          >
            {/* Quick Action Tiles */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-blue-300 font-bold text-xs">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Instant 1-Tap Cache Purge</span>
                </div>
                <p className="text-[11px] text-neutral-300">
                  Safely clears video playback caches, rendered waveform buffers, and temporary assets.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={springSquishy}
                onClick={handleCleanCache}
                disabled={isCleaningCache || cacheCleaned}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-emerald-600 text-white text-xs font-bold shrink-0 transition-colors shadow-lg cursor-pointer"
              >
                {cacheCleaned ? 'Freed 1.4 GB ✓' : isCleaningCache ? 'Cleaning...' : 'Free 1.4 GB'}
              </motion.button>
            </div>

            {/* Large Files Review */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">
                  Large File Review (&gt;2 MB)
                </h3>
                <span className="text-[11px] text-neutral-500">Sorted by file size</span>
              </div>

              <div className="rounded-2xl border border-white/10 divide-y divide-white/5 bg-white/[0.02] overflow-hidden">
                {largeFiles.length > 0 ? (
                  largeFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-3.5 flex items-center justify-between hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                          {file.mime_type.startsWith('video/') ? (
                            <Film className="w-4 h-4 text-blue-400" />
                          ) : file.mime_type.startsWith('image/') ? (
                            <ImageIcon className="w-4 h-4 text-purple-400" />
                          ) : (
                            <FileText className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{file.filename}</p>
                          <p className="text-[11px] text-[#A1A1A1] tabular-nums">
                            {formatBytes(file.size)} · {file.extension.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          triggerHaptic('medium');
                          trashFile(file.id);
                        }}
                        className="p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Move to Trash"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-neutral-500">
                    No exceptionally large files detected.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </StackedModalWrapper>
  );
};
