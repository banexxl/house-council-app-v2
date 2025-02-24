'use client'

import { motion } from 'framer-motion'

/**
 * Animate component is a wrapper around framer-motion's motion.div
 * providing a simple animation effect to fade in its children.
 *
 * @param {Object} props - Component properties.
 * @param {React.ReactNode} props.children - Elements to be animated.
 *
 * The animation starts with elements fully transparent and makes them
 * visible with a linear transition over 1 second.
 */

export default function Animate({ children }: { children: React.ReactNode }) {
     return (
          <motion.div
               initial={{ y: 0, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               // exit={{ y: 100, opacity: 0 }}
               transition={{ ease: 'linear', duration: 1 }}
          >
               {children}
          </motion.div>
     )
}