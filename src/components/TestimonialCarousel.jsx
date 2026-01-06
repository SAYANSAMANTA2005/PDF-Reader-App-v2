import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TestimonialCarousel = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [autoPlay, setAutoPlay] = useState(true);

    const testimonials = [
        {
            name: "Sarah Chen",
            role: "MIT Computer Science",
            avatar: "SC",
            quote: "This app increased my reading speed by 40% and helped me ace my finals. The AI summaries are a game-changer!",
            rating: 5,
            color: "from-blue-500 to-cyan-500"
        },
        {
            name: "Marcus Rodriguez",
            role: "Stanford Law Student",
            avatar: "MR",
            quote: "The OCR feature saved me hundreds of hours. I can now search through my entire case law library instantly.",
            rating: 5,
            color: "from-purple-500 to-pink-500"
        },
        {
            name: "Priya Patel",
            role: "Harvard Medical",
            avatar: "PP",
            quote: "The AI mentor feels like having a personal tutor 24/7. It explains complex medical concepts in simple terms.",
            rating: 5,
            color: "from-emerald-500 to-teal-500"
        },
        {
            name: "Alex Thompson",
            role: "Oxford PhD Candidate",
            avatar: "AT",
            quote: "The citation generator and Zotero integration are perfect. It's now my go-to tool for research.",
            rating: 5,
            color: "from-orange-500 to-red-500"
        }
    ];

    useEffect(() => {
        if (!autoPlay) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % testimonials.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [autoPlay, testimonials.length]);

    const next = () => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
        setAutoPlay(false);
    };

    const prev = () => {
        setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
        setAutoPlay(false);
    };

    return (
        <div className="relative">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary">
                    Loved by 50,000+ Students
                </h3>
                <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                    ))}
                    <span className="text-xs font-black text-secondary ml-1">4.9/5</span>
                </div>
            </div>

            <div className="relative bg-gradient-to-br from-accent/5 to-purple-500/5 rounded-2xl p-8 border border-accent/10 overflow-hidden">
                {/* Quote Icon */}
                <Quote size={48} className="absolute top-4 right-4 text-accent/10" />

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="relative z-10"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${testimonials[currentIndex].color} flex items-center justify-center text-white text-xl font-black shadow-lg`}>
                                {testimonials[currentIndex].avatar}
                            </div>
                            <div>
                                <p className="text-sm font-black text-primary">{testimonials[currentIndex].name}</p>
                                <p className="text-xs text-secondary font-medium">{testimonials[currentIndex].role}</p>
                                <div className="flex items-center gap-0.5 mt-1">
                                    {Array.from({ length: testimonials[currentIndex].rating }).map((_, i) => (
                                        <Star key={i} size={10} className="text-amber-400 fill-amber-400" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <p className="text-primary text-sm leading-relaxed font-medium italic">
                            "{testimonials[currentIndex].quote}"
                        </p>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6">
                    <button
                        onClick={prev}
                        className="p-2 bg-white dark:bg-bg-secondary rounded-xl border border-divider hover:border-accent transition"
                    >
                        <ChevronLeft size={16} className="text-secondary" />
                    </button>

                    <div className="flex gap-2">
                        {testimonials.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setCurrentIndex(i);
                                    setAutoPlay(false);
                                }}
                                className={`h-1.5 rounded-full transition-all ${i === currentIndex
                                        ? 'w-8 bg-accent'
                                        : 'w-1.5 bg-secondary hover:bg-accent/50'
                                    }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={next}
                        className="p-2 bg-white dark:bg-bg-secondary rounded-xl border border-divider hover:border-accent transition"
                    >
                        <ChevronRight size={16} className="text-secondary" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestimonialCarousel;
