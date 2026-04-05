// Auto-generated types from openapi.yaml — do not edit manually.
// To regenerate: npm run api:types (then this file updates automatically)
import type { components } from './generated/api';

export type User               = components['schemas']['User'];
export type Project            = components['schemas']['Project'];
export type Run                = components['schemas']['Run'];
export type RunSteps           = components['schemas']['RunSteps'];
export type Asset              = components['schemas']['Asset'];
export type AssetDetail        = components['schemas']['AssetDetail'];
export type AssetsPayload      = components['schemas']['AssetsPayload'];
export type SoftwareInstance   = components['schemas']['SoftwareInstance'];
export type SafetyFunction     = components['schemas']['SafetyFunction'];
export type DataFlow           = components['schemas']['DataFlow'];
export type Interface          = components['schemas']['Interface'];
export type TrustBoundary      = components['schemas']['TrustBoundary'];
export type PathHop            = components['schemas']['PathHop'];
export type Threat             = components['schemas']['Threat'];
export type CveMatch           = components['schemas']['CveMatch'];
export type AttackPath         = components['schemas']['AttackPath'];
export type RiskItem           = components['schemas']['RiskItem'];
export type Mitigation         = components['schemas']['Mitigation'];
export type MitigationRiskLink = components['schemas']['MitigationRiskLink'];
export type Report             = components['schemas']['Report'];

// Enum string literal types — derived from schema enums
export type UserRole       = components['schemas']['UserRole'];
export type ProjectDomain  = components['schemas']['ProjectDomain'];
export type ProjectStatus  = components['schemas']['ProjectStatus'];
export type RunStatus      = components['schemas']['RunStatus'];
export type StepStatus     = components['schemas']['StepStatus'];
export type CveMatchTier   = components['schemas']['CveMatchTier'];
export type RiskSourceType = components['schemas']['RiskSourceType'];
export type RiskSeverity   = components['schemas']['RiskSeverity'];
export type ReportFormat   = components['schemas']['ReportFormat'];
export type ReportStatus   = components['schemas']['ReportStatus'];
