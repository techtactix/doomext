export class ContentClassifier {
    private readonly subjectPatterns: { [key: string]: RegExp[] } = {
        math: [
            /\b(math|mathematics|mathematical|algebra|calculus|geometry|trigonometry)\b/i,
            /\b(theorem|proof|equation|formula|problem|solution)\b/i,
            /\b(sine|cosine|tangent|angle|triangle|degree|radian)\b/i,
            /\b(sohcahtoa|hypotenuse|adjacent|opposite)\b/i,
            /\b(function|graph|coordinate|axis|plane)\b/i
        ],
        physics: [
            /\b(physics|physical|mechanics|dynamics|kinematics)\b/i,
            /\b(force|energy|momentum|velocity|acceleration)\b/i,
            /\b(newton|gravity|mass|weight|motion)\b/i
        ],
        chemistry: [
            /\b(chemistry|chemical|reaction|molecule|atom)\b/i,
            /\b(bond|element|compound|solution|acid|base)\b/i,
            /\b(organic|inorganic|biochemistry)\b/i
        ]
    };

    private readonly educationalPatterns: RegExp[] = [
        /\b(tutorial|lesson|course|lecture|class)\b/i,
        /\b(learn|study|practice|exercise|example)\b/i,
        /\b(explained|introduction|basics|guide|help)\b/i,
        /\b(concept|theory|principle|method|technique)\b/i,
        /how\s+to\b/i,
        /step\s+by\s+step/i
    ];

    private readonly nonEducationalPatterns: RegExp[] = [
        /\b(game|gaming|gameplay|playthrough)\b/i,
        /\b(sport|sports|football|soccer|basketball)\b/i,
        /\b(music|song|dance|concert|album)\b/i,
        /\b(movie|film|trailer|teaser|review)\b/i,
        /\b(funny|prank|challenge|vlog|reaction)\b/i,
        /\b(vs|versus|match|highlights|score)\b/i,
        /\b(unboxing|haul|shopping|buy|price)\b/i,
        /\bclick\s*bait\b/i,
        /\b(viral|trending|popular|famous)\b/i
    ];

    private readonly educationalChannels: Set<string> = new Set([
        'khan academy',
        '3blue1brown',
        'numberphile',
        'mathologer',
        'patrickjmt',
        'organic chemistry tutor',
        'professor leonard',
        'nancy pi',
        'mathbff',
        'blackpenredpen',
        'dr. trefor bazett',
        'brain station',
        'tecmath',
        'brilliant',
        'crash course',
        'vsauce',
        'veritasium',
        'minutephysics',
        'academic lesson'
    ]);

    public isRelevantContent(content: string, topic: string, isRecommendation: boolean = false): boolean {
        const normalizedContent = content.toLowerCase();
        const normalizedTopic = topic.toLowerCase();

        // First, check if it's from an educational channel
        if (this.isFromEducationalChannel(normalizedContent)) {
            // Even for educational channels, ensure some topic relevance
            return this.hasTopicRelevance(normalizedContent, normalizedTopic);
        }

        // Check for non-educational content
        if (this.containsNonEducationalContent(normalizedContent)) {
            return false;
        }

        // Calculate relevance scores
        const scores = {
            subject: this.calculateSubjectScore(normalizedContent, normalizedTopic),
            educational: this.calculateEducationalScore(normalizedContent),
            topical: this.calculateTopicScore(normalizedContent, normalizedTopic)
        };

        // Higher threshold for recommendations
        const threshold = isRecommendation ? 0.7 : 0.5;
        const totalScore = (scores.subject + scores.educational + scores.topical) / 3;

        return totalScore >= threshold;
    }

    private isFromEducationalChannel(content: string): boolean {
        return Array.from(this.educationalChannels).some(channel => 
            content.includes(channel.toLowerCase())
        );
    }

    private containsNonEducationalContent(content: string): boolean {
        return this.nonEducationalPatterns.some(pattern => pattern.test(content));
    }

    private hasTopicRelevance(content: string, topic: string): boolean {
        // Get the subject area from the topic
        const subject = Object.keys(this.subjectPatterns).find(key => 
            topic.includes(key) || content.includes(key)
        );

        if (subject) {
            return this.subjectPatterns[subject].some(pattern => pattern.test(content));
        }

        // If no specific subject found, check for exact topic match
        return content.includes(topic);
    }

    private calculateSubjectScore(content: string, topic: string): number {
        let matches = 0;
        let totalPatterns = 0;

        // Find relevant subject patterns
        const relevantSubjects = Object.keys(this.subjectPatterns).filter(subject => 
            topic.includes(subject) || content.includes(subject)
        );

        if (relevantSubjects.length === 0) return 0;

        relevantSubjects.forEach(subject => {
            const patterns = this.subjectPatterns[subject];
            totalPatterns += patterns.length;
            matches += patterns.filter(pattern => pattern.test(content)).length;
        });

        return matches / Math.min(totalPatterns, 5); // Normalize to 0-1
    }

    private calculateEducationalScore(content: string): number {
        const matches = this.educationalPatterns.filter(pattern => 
            pattern.test(content)
        ).length;
        return matches / Math.min(this.educationalPatterns.length, 3); // Normalize to 0-1
    }

    private calculateTopicScore(content: string, topic: string): number {
        const words = topic.split(/\s+/);
        const matches = words.filter(word => 
            word.length > 3 && content.includes(word)
        ).length;
        return matches / words.length;
    }
} 