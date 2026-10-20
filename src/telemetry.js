const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus')
const { NodeSDK } = require('@opentelemetry/sdk-node')

const metricReader = new PrometheusExporter({
  port: Number(process.env.OTEL_PROMETHEUS_PORT || 9464),
  endpoint: '/metrics'
})

const sdk = new NodeSDK({ metricReader })
sdk.start()

module.exports = sdk
