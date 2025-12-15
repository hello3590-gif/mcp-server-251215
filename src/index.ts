import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { InferenceClient } from '@huggingface/inference'

// Create server instance
const server = new McpServer({
    name: 'YOUR_SERVER_NAME',
    version: '1.0.0'
})

// Initialize Hugging Face Inference Client
const hfClient = new InferenceClient(process.env.HF_TOKEN || '')

server.registerTool(
    'greet',
    {
        description: '이름과 언어를 입력하면 인사말을 반환합니다.',
        inputSchema: z.object({
            name: z.string().describe('인사할 사람의 이름'),
            language: z
                .enum(['ko', 'en'])
                .optional()
                .default('en')
                .describe('인사 언어 (기본값: en)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('인사말')
                    })
                )
                .describe('인사말')
        })
    },
    async ({ name, language }) => {
        const greeting =
            language === 'ko'
                ? `안녕하세요, ${name}님!`
                : `Hey there, ${name}! 👋 Nice to meet you!`

        return {
            content: [
                {
                    type: 'text' as const,
                    text: greeting
                }
            ],
            structuredContent: {
                content: [
                    {
                        type: 'text' as const,
                        text: greeting
                    }
                ]
            }
        }
    }
)

server.registerTool(
    'calculator',
    {
        description: '두 개의 숫자와 연산자를 입력받아 사칙연산 결과를 반환합니다.',
        inputSchema: z.object({
            num1: z.number().describe('첫 번째 숫자'),
            num2: z.number().describe('두 번째 숫자'),
            operator: z
                .enum(['+', '-', '*', '/'])
                .describe('연산자 (+, -, *, /)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('계산 결과')
                    })
                )
                .describe('계산 결과')
        })
    },
    async ({ num1, num2, operator }) => {
        let result: number
        let resultText: string

        switch (operator) {
            case '+':
                result = num1 + num2
                resultText = `${num1} + ${num2} = ${result}`
                break
            case '-':
                result = num1 - num2
                resultText = `${num1} - ${num2} = ${result}`
                break
            case '*':
                result = num1 * num2
                resultText = `${num1} × ${num2} = ${result}`
                break
            case '/':
                if (num2 === 0) {
                    resultText = '오류: 0으로 나눌 수 없습니다.'
                } else {
                    result = num1 / num2
                    resultText = `${num1} ÷ ${num2} = ${result}`
                }
                break
            default:
                resultText = '오류: 지원하지 않는 연산자입니다.'
        }

        return {
            content: [
                {
                    type: 'text' as const,
                    text: resultText
                }
            ],
            structuredContent: {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText
                    }
                ]
            }
        }
    }
)

server.registerTool(
    'time',
    {
        description: '현재 시간을 가져오거나 시간대를 변환합니다.',
        inputSchema: z.object({
            timezone: z
                .string()
                .optional()
                .describe('시간대 (예: Asia/Seoul, America/New_York, UTC). 생략 시 로컬 시간대 사용'),
            action: z
                .enum(['current', 'convert'])
                .optional()
                .default('current')
                .describe('동작: current(현재 시간), convert(시간대 변환)'),
            sourceTimezone: z
                .string()
                .optional()
                .describe('변환할 원본 시간대 (action이 convert일 때 필요)'),
            targetTimezone: z
                .string()
                .optional()
                .describe('변환할 대상 시간대 (action이 convert일 때 필요)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('시간 정보')
                    })
                )
                .describe('시간 정보')
        })
    },
    async ({ timezone, action, sourceTimezone, targetTimezone }) => {
        let resultText: string

        try {
            if (action === 'convert') {
                if (!sourceTimezone || !targetTimezone) {
                    resultText = '오류: 시간대 변환을 위해서는 sourceTimezone과 targetTimezone이 필요합니다.'
                } else {
                    const now = new Date()
                    const sourceDate = new Date(
                        now.toLocaleString('en-US', { timeZone: sourceTimezone })
                    )
                    const targetDate = new Date(
                        now.toLocaleString('en-US', { timeZone: targetTimezone })
                    )

                    const sourceTime = sourceDate.toLocaleString('ko-KR', {
                        timeZone: sourceTimezone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    })

                    const targetTime = targetDate.toLocaleString('ko-KR', {
                        timeZone: targetTimezone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    })

                    resultText = `${sourceTimezone}: ${sourceTime}\n${targetTimezone}: ${targetTime}`
                }
            } else {
                // current action
                const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
                const now = new Date()
                const formattedTime = now.toLocaleString('ko-KR', {
                    timeZone: tz,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                })

                resultText = `현재 시간 (${tz}): ${formattedTime}`
            }
        } catch (error) {
            resultText = `오류: 유효하지 않은 시간대입니다. ${error instanceof Error ? error.message : String(error)}`
        }

        return {
            content: [
                {
                    type: 'text' as const,
                    text: resultText
                }
            ],
            structuredContent: {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText
                    }
                ]
            }
        }
    }
)

server.registerTool(
    'geocode',
    {
        description: '도시 이름이나 주소를 입력받아서 위도와 경도 좌표를 반환합니다.',
        inputSchema: z.object({
            address: z.string().describe('도시 이름이나 주소 (예: 서울, New York, Paris, France)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('위도와 경도 좌표 정보')
                    })
                )
                .describe('위도와 경도 좌표 정보')
        })
    },
    async ({ address }) => {
        let resultText: string

        try {
            const url = new URL('https://nominatim.openstreetmap.org/search')
            url.searchParams.set('q', address)
            url.searchParams.set('format', 'json')
            url.searchParams.set('limit', '1')

            const response = await fetch(url.toString(), {
                headers: {
                    'User-Agent': 'MCP-Geocode-Tool/1.0'
                }
            })

            if (!response.ok) {
                throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()

            if (!data || data.length === 0) {
                resultText = `주소를 찾을 수 없습니다: "${address}"`
            } else {
                const result = data[0]
                const lat = parseFloat(result.lat)
                const lon = parseFloat(result.lon)
                const displayName = result.display_name || address

                resultText = `주소: ${displayName}\n위도: ${lat}\n경도: ${lon}\n좌표: ${lat}, ${lon}`
            }
        } catch (error) {
            resultText = `오류: 지오코딩 중 문제가 발생했습니다. ${error instanceof Error ? error.message : String(error)}`
        }

        return {
            content: [
                {
                    type: 'text' as const,
                    text: resultText
                }
            ],
            structuredContent: {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText
                    }
                ]
            }
        }
    }
)

server.registerTool(
    'get-weather',
    {
        description: '위도와 경도 좌표, 예보 기간을 입력받아서 해당 위치의 현재 날씨와 예보 정보를 제공합니다.',
        inputSchema: z.object({
            latitude: z.number().describe('위도 좌표 (예: 37.5665)'),
            longitude: z.number().describe('경도 좌표 (예: 126.9780)'),
            forecastDays: z
                .number()
                .int()
                .min(1)
                .max(16)
                .optional()
                .default(7)
                .describe('예보 기간 (일 단위, 1-16일, 기본값: 7일)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('날씨 정보')
                    })
                )
                .describe('날씨 정보')
        })
    },
    async ({ latitude, longitude, forecastDays }) => {
        let resultText: string

        try {
            const url = new URL('https://api.open-meteo.com/v1/forecast')
            url.searchParams.set('latitude', latitude.toString())
            url.searchParams.set('longitude', longitude.toString())
            url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m')
            url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum')
            url.searchParams.set('forecast_days', forecastDays.toString())
            url.searchParams.set('timezone', 'auto')

            const response = await fetch(url.toString())

            if (!response.ok) {
                throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()

            if (!data || !data.current) {
                throw new Error('날씨 데이터를 가져올 수 없습니다.')
            }

            // 날씨 코드를 설명으로 변환하는 함수
            const getWeatherDescription = (code: number): string => {
                const weatherCodes: Record<number, string> = {
                    0: '맑음',
                    1: '대체로 맑음',
                    2: '부분적으로 흐림',
                    3: '흐림',
                    45: '안개',
                    48: '서리 안개',
                    51: '약한 이슬비',
                    53: '보통 이슬비',
                    55: '강한 이슬비',
                    56: '약한 동결 이슬비',
                    57: '강한 동결 이슬비',
                    61: '약한 비',
                    63: '보통 비',
                    65: '강한 비',
                    66: '약한 동결 비',
                    67: '강한 동결 비',
                    71: '약한 눈',
                    73: '보통 눈',
                    75: '강한 눈',
                    77: '눈알',
                    80: '약한 소나기',
                    81: '보통 소나기',
                    82: '강한 소나기',
                    85: '약한 눈 소나기',
                    86: '강한 눈 소나기',
                    95: '뇌우',
                    96: '우박과 함께하는 뇌우',
                    99: '강한 우박과 함께하는 뇌우'
                }
                return weatherCodes[code] || `날씨 코드: ${code}`
            }

            // 현재 날씨 정보
            const current = data.current
            const currentTemp = current.temperature_2m
            const currentHumidity = current.relative_humidity_2m
            const currentWeather = getWeatherDescription(current.weather_code)
            const currentWindSpeed = current.wind_speed_10m

            let weatherInfo = `📍 위치: 위도 ${latitude}, 경도 ${longitude}\n\n`
            weatherInfo += `🌤️ 현재 날씨\n`
            weatherInfo += `온도: ${currentTemp}°C\n`
            weatherInfo += `날씨: ${currentWeather}\n`
            weatherInfo += `습도: ${currentHumidity}%\n`
            weatherInfo += `풍속: ${currentWindSpeed} km/h\n\n`

            // 예보 정보
            if (data.daily && data.daily.time) {
                weatherInfo += `📅 ${forecastDays}일 예보\n`
                weatherInfo += '─'.repeat(50) + '\n'

                for (let i = 0; i < Math.min(forecastDays, data.daily.time.length); i++) {
                    const date = new Date(data.daily.time[i])
                    const dateStr = date.toLocaleDateString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                        weekday: 'short'
                    })
                    const maxTemp = data.daily.temperature_2m_max[i]
                    const minTemp = data.daily.temperature_2m_min[i]
                    const weather = getWeatherDescription(data.daily.weather_code[i])
                    const precipitation = data.daily.precipitation_sum[i]

                    weatherInfo += `${dateStr}: ${weather}\n`
                    weatherInfo += `  최고: ${maxTemp}°C | 최저: ${minTemp}°C`
                    if (precipitation > 0) {
                        weatherInfo += ` | 강수량: ${precipitation}mm`
                    }
                    weatherInfo += '\n'
                }
            }

            resultText = weatherInfo
        } catch (error) {
            resultText = `오류: 날씨 정보를 가져오는 중 문제가 발생했습니다. ${error instanceof Error ? error.message : String(error)}`
        }

        return {
            content: [
                {
                    type: 'text' as const,
                    text: resultText
                }
            ],
            structuredContent: {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText
                    }
                ]
            }
        }
    }
)

// 서버 정보 및 도구 목록 리소스
server.registerResource(
    'server-info',
    'mcp://server-info',
    {
        title: '서버 정보',
        description: '현재 서버 정보와 사용 가능한 도구 목록을 반환합니다.',
        mimeType: 'application/json'
    },
    async () => {
        const serverInfo = {
            server: {
                name: 'YOUR_SERVER_NAME',
                version: '1.0.0',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                nodeVersion: process.version,
                platform: process.platform
            },
            tools: [
                {
                    name: 'greet',
                    description: '이름과 언어를 입력하면 인사말을 반환합니다.'
                },
                {
                    name: 'calculator',
                    description: '두 개의 숫자와 연산자를 입력받아 사칙연산 결과를 반환합니다.'
                },
                {
                    name: 'time',
                    description: '현재 시간을 가져오거나 시간대를 변환합니다.'
                },
                {
                    name: 'geocode',
                    description: '도시 이름이나 주소를 입력받아서 위도와 경도 좌표를 반환합니다.'
                },
                {
                    name: 'get-weather',
                    description: '위도와 경도 좌표, 예보 기간을 입력받아서 해당 위치의 현재 날씨와 예보 정보를 제공합니다.'
                }
            ],
            resources: [
                {
                    uri: 'mcp://server-info',
                    name: '서버 정보',
                    description: '현재 서버 정보와 사용 가능한 도구 목록'
                }
            ]
        }

        return {
            contents: [
                {
                    uri: 'mcp://server-info',
                    mimeType: 'application/json',
                    text: JSON.stringify(serverInfo, null, 2)
                }
            ]
        }
    }
)

// 코드 리뷰 프롬프트
server.registerPrompt(
    'code-review',
    {
        title: '코드 리뷰',
        description: '코드를 입력받아 체계적인 코드 리뷰를 수행하는 프롬프트입니다.',
        argsSchema: {
            code: z.string().describe('리뷰할 코드'),
            language: z
                .string()
                .optional()
                .describe('코드 언어 (예: typescript, javascript, python, java 등)'),
            reviewStyle: z
                .enum(['strict', 'friendly', 'detailed', 'quick'])
                .optional()
                .default('detailed')
                .describe('리뷰 스타일 (strict: 엄격, friendly: 친절, detailed: 상세, quick: 빠른)')
        }
    },
    async ({ code, language, reviewStyle }) => {
        // 미리 정의된 코드 리뷰 프롬프트 템플릿
        const reviewTemplates: Record<string, string> = {
            strict: `다음 코드를 엄격한 기준으로 리뷰해주세요. 모든 잠재적 문제점, 보안 취약점, 성능 이슈, 코드 스타일 위반을 지적해주세요.`,
            friendly: `다음 코드를 친절하고 건설적인 톤으로 리뷰해주세요. 개선점을 제안하면서도 긍정적인 피드백을 포함해주세요.`,
            detailed: `다음 코드를 상세하게 리뷰해주세요. 코드 구조, 알고리즘 효율성, 에러 처리, 가독성, 유지보수성, 테스트 가능성 등을 종합적으로 분석해주세요.`,
            quick: `다음 코드를 빠르게 리뷰해주세요. 가장 중요한 문제점과 개선사항만 간단히 요약해주세요.`
        }

        const languageContext = language
            ? `\n\n참고: 이 코드는 ${language}로 작성되었습니다. ${language}의 모범 사례와 관례를 고려하여 리뷰해주세요.`
            : ''

        const selectedStyle = reviewStyle || 'detailed'
        const reviewPrompt = reviewTemplates[selectedStyle] || reviewTemplates.detailed

        const fullPrompt = `${reviewPrompt}

리뷰할 코드:
\`\`\`${language || 'text'}
${code}
\`\`\`
${languageContext}

리뷰 시 다음 항목을 포함해주세요:
1. 코드 품질 및 구조
2. 잠재적 버그 및 에러 처리
3. 성능 최적화 기회
4. 보안 고려사항
5. 가독성 및 유지보수성
6. 개선 제안사항`

        return {
            description: `${selectedStyle} 스타일로 코드 리뷰를 수행합니다.`,
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: fullPrompt
                    }
                }
            ]
        }
    }
)

server.registerTool(
    'generate-image',
    {
        description: '텍스트 프롬프트를 입력받아서 이미지를 생성합니다.',
        inputSchema: z.object({
            prompt: z.string().describe('이미지 생성을 위한 텍스트 프롬프트')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('image'),
                        data: z.string().describe('base64 인코딩된 이미지 데이터'),
                        mimeType: z.string().describe('이미지 MIME 타입')
                    })
                )
                .describe('생성된 이미지')
        })
    },
    async ({ prompt }) => {
        try {
            if (!process.env.HF_TOKEN) {
                throw new Error('HF_TOKEN 환경변수가 설정되지 않았습니다.')
            }

            const image = await hfClient.textToImage({
                provider: 'auto',
                model: 'black-forest-labs/FLUX.1-schnell',
                inputs: prompt,
                parameters: { num_inference_steps: 5 }
            })

            // Blob을 base64로 변환
            let base64Data: string
            let mimeType: string = 'image/png'

            // Blob 타입 체크 및 변환
            if (image && typeof image === 'object' && 'arrayBuffer' in image) {
                const blob = image as Blob
                const arrayBuffer = await blob.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)
                base64Data = buffer.toString('base64')
                mimeType = blob.type || 'image/png'
            } else if (typeof image === 'string') {
                // 이미 base64 문자열인 경우
                base64Data = image
            } else {
                // ArrayBuffer나 다른 타입인 경우
                const buffer = Buffer.from(image as ArrayBuffer)
                base64Data = buffer.toString('base64')
            }

            return {
                content: [
                    {
                        type: 'image' as const,
                        data: base64Data,
                        mimeType: mimeType,
                        annotations: {
                            audience: ['user'],
                            priority: 0.9
                        }
                    }
                ]
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `오류: 이미지 생성 중 문제가 발생했습니다. ${error instanceof Error ? error.message : String(error)}`
                    }
                ]
            }
        }
    }
)

server
    .connect(new StdioServerTransport())
    .catch(console.error)
    .then(() => {
        console.log('MCP server started')
    })
