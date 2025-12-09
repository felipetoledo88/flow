import React from 'react';
import { X, Send, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatWidget = ({ isOpen, onClose }: ChatWidgetProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-50 w-96 h-[600px]"
        >
          <Card className="w-full h-full flex flex-col shadow-2xl border-0 overflow-hidden bg-gradient-to-b from-card to-card/95">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-white/20">
                      <AvatarFallback className="bg-white/10 text-white">
                        <Brain className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <h3 className="font-semibold">Flow</h3>
                    <p className="text-xs text-white/80 flex items-center gap-1">
                      <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                      Online
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={onClose}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-white/10 text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 space-y-4">
              <div className="text-center text-muted-foreground py-8">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Chat em desenvolvimento</p>
                <p className="text-xs mt-2">Em breve você poderá conversar com o Flow</p>
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-border/50 bg-card/50 backdrop-blur">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-background/50"
                  disabled
                />
                <Button
                  size="sm"
                  disabled
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatWidget;
