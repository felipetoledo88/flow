import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Brain, Target, BarChart3, Users, Settings, FolderOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernLoaderProps {
  isVisible?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
  variant?: 'default' | 'pulse' | 'flow' | 'particles' | 'gradient' | 'skeleton';
  message?: string;
  submessage?: string;
  icon?: 'default' | 'brain' | 'target' | 'chart' | 'users' | 'settings' | 'folder' | 'sparkles' | React.ReactNode;
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'indigo';
  overlay?: boolean;
  className?: string;
  progress?: number; // 0-100
}

const icons = {
  default: Loader2,
  brain: Brain,
  target: Target,
  chart: BarChart3,
  users: Users,
  settings: Settings,
  folder: FolderOpen,
  sparkles: Sparkles
};

const colors = {
  blue: {
    primary: 'from-blue-500 to-cyan-400',
    secondary: '#3b82f6',
    accent: 'bg-blue-400',
    glow: 'bg-blue-400'
  },
  purple: {
    primary: 'from-purple-500 to-pink-400',
    secondary: '#8b5cf6', 
    accent: 'bg-purple-400',
    glow: 'bg-purple-400'
  },
  green: {
    primary: 'from-green-500 to-emerald-400',
    secondary: '#10b981',
    accent: 'bg-green-400',
    glow: 'bg-green-400'
  },
  orange: {
    primary: 'from-orange-500 to-amber-400',
    secondary: '#f59e0b',
    accent: 'bg-orange-400',
    glow: 'bg-orange-400'
  },
  pink: {
    primary: 'from-pink-500 to-rose-400',
    secondary: '#ec4899',
    accent: 'bg-pink-400',
    glow: 'bg-pink-400'
  },
  indigo: {
    primary: 'from-indigo-500 to-blue-400',
    secondary: '#6366f1',
    accent: 'bg-indigo-400',
    glow: 'bg-indigo-400'
  }
};

const sizes = {
  sm: { container: 'w-16 h-16', icon: 'h-6 w-6', text: 'text-sm' },
  md: { container: 'w-24 h-24', icon: 'h-8 w-8', text: 'text-base' },
  lg: { container: 'w-32 h-32', icon: 'h-12 w-12', text: 'text-lg' },
  xl: { container: 'w-40 h-40', icon: 'h-16 w-16', text: 'text-xl' },
  fullscreen: { container: 'w-48 h-48', icon: 'h-20 w-20', text: 'text-2xl' }
};

const ModernLoader: React.FC<ModernLoaderProps> = ({
  isVisible = true,
  size = 'md',
  variant = 'flow',
  message = 'Carregando...',
  submessage,
  icon = 'default',
  color = 'blue',
  overlay = false,
  className,
  progress
}) => {
  const IconComponent = typeof icon === 'string' ? icons[icon] : null;
  const colorTheme = colors[color];
  const sizeTheme = sizes[size];

  const renderLoader = () => {
    switch (variant) {
      case 'flow':
        return (
          <div className="relative flex items-center justify-center">
            {/* Central Icon */}
            <div className={cn(
              sizeTheme.container,
              "relative flex items-center justify-center"
            )}>
              {/* Rotating Rings */}
              {[0, 1, 2].map((ring) => (
                <motion.div
                  key={ring}
                  className={`absolute border-2 border-transparent rounded-full`}
                  style={{
                    width: `${100 - ring * 20}%`,
                    height: `${100 - ring * 20}%`,
                    borderTopColor: colorTheme.secondary,
                    borderRightColor: ring === 1 ? colorTheme.secondary : 'transparent'
                  }}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 2 + ring * 0.5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              ))}

              {/* Central Core */}
              <motion.div
                className={cn(
                  "relative z-10 rounded-full bg-gradient-to-r",
                  colorTheme.primary,
                  "flex items-center justify-center shadow-xl",
                  size === 'sm' ? 'w-8 h-8' : 
                  size === 'md' ? 'w-12 h-12' :
                  size === 'lg' ? 'w-16 h-16' :
                  size === 'xl' ? 'w-20 h-20' : 'w-24 h-24'
                )}
                animate={{
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    '0 0 0 0px rgba(59, 130, 246, 0.4)',
                    '0 0 0 12px rgba(59, 130, 246, 0)',
                    '0 0 0 0px rgba(59, 130, 246, 0)'
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {IconComponent && (
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  >
                    <IconComponent className={cn(sizeTheme.icon, "text-white")} />
                  </motion.div>
                )}
                {typeof icon === 'object' && icon}
              </motion.div>

              {/* Orbiting Dots */}
              {[0, 1, 2, 3, 4, 5].map((dot) => {
                const angle = (dot * 60) * (Math.PI / 180);
                const radius = size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 40 : size === 'xl' ? 48 : 56;
                return (
                  <motion.div
                    key={dot}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: colorTheme.secondary,
                      left: '50%',
                      top: '50%',
                      transformOrigin: '0 0'
                    }}
                    animate={{
                      x: [
                        Math.cos(angle) * radius,
                        Math.cos(angle + Math.PI) * radius,
                        Math.cos(angle + 2 * Math.PI) * radius
                      ],
                      y: [
                        Math.sin(angle) * radius,
                        Math.sin(angle + Math.PI) * radius,
                        Math.sin(angle + 2 * Math.PI) * radius
                      ],
                      scale: [0.8, 1.2, 0.8],
                      opacity: [0.6, 1, 0.6]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: dot * 0.2,
                      ease: "easeInOut"
                    }}
                  />
                );
              })}
            </div>
          </div>
        );

      case 'particles':
        return (
          <div className="relative flex items-center justify-center">
            <div className={cn(sizeTheme.container, "relative")}>
              {/* Particle System */}
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: colorTheme.secondary,
                    left: '50%',
                    top: '50%'
                  }}
                  animate={{
                    x: [0, (Math.random() - 0.5) * 100, 0],
                    y: [0, (Math.random() - 0.5) * 100, 0],
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeOut"
                  }}
                />
              ))}
              
              {/* Central Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                {IconComponent && <IconComponent className={sizeTheme.icon} style={{ color: colorTheme.secondary }} />}
              </div>
            </div>
          </div>
        );

      case 'gradient':
        return (
          <div className="relative flex items-center justify-center">
            <motion.div
              className={cn(
                sizeTheme.container,
                "rounded-full bg-gradient-to-r",
                colorTheme.primary,
                "flex items-center justify-center shadow-2xl"
              )}
              animate={{
                rotate: [0, 360],
                scale: [1, 1.05, 1]
              }}
              transition={{
                rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              {IconComponent && <IconComponent className={cn(sizeTheme.icon, "text-white")} />}
            </motion.div>
          </div>
        );

      case 'pulse':
        return (
          <div className="relative flex items-center justify-center">
            <motion.div
              className={cn(
                sizeTheme.container,
                "rounded-full bg-gradient-to-r",
                colorTheme.primary,
                "flex items-center justify-center"
              )}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {IconComponent && <IconComponent className={cn(sizeTheme.icon, "text-white")} />}
            </motion.div>
          </div>
        );

      case 'skeleton':
        return (
          <div className="space-y-4 w-full max-w-md">
            <div className="flex items-center space-x-4">
              <motion.div 
                className="w-12 h-12 bg-gray-200 rounded-full"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <div className="space-y-2 flex-1">
                <motion.div 
                  className="h-4 bg-gray-200 rounded w-3/4"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
                />
                <motion.div 
                  className="h-3 bg-gray-200 rounded w-1/2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="h-3 bg-gray-200 rounded w-full"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 + 0.3 }}
              />
            ))}
          </div>
        );

      default:
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className={sizeTheme.icon}
            style={{ color: colorTheme.secondary }}
          >
            <Loader2 />
          </motion.div>
        );
    }
  };

  const content = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={cn(
            "flex flex-col items-center justify-center gap-6",
            size === 'fullscreen' ? 'min-h-screen' : '',
            className
          )}
        >
          {/* Loader Animation */}
          <div className="relative">
            {renderLoader()}
            
            {/* Glow Effect */}
            <div 
              className="absolute inset-0 rounded-full opacity-20 blur-xl -z-10"
              style={{ backgroundColor: colorTheme.secondary }}
            />
          </div>

          {/* Text Content */}
          {(message || submessage || progress !== undefined) && (
            <div className="text-center space-y-2 max-w-xs">
              {message && (
                <motion.h3
                  className={cn(
                    "font-semibold text-foreground",
                    sizeTheme.text
                  )}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {message}
                </motion.h3>
              )}
              
              {submessage && (
                <motion.p
                  className="text-sm text-muted-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {submessage}
                </motion.p>
              )}

              {progress !== undefined && (
                <div className="w-full space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className={cn("h-full bg-gradient-to-r rounded-full", colorTheme.primary)}
                      initial={{ width: '0%' }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(progress)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (overlay) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return content;
};

export { ModernLoader };
export type { ModernLoaderProps };