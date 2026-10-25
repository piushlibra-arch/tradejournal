from typing import Dict, List, Type
from app.brokers.base import BaseBrokerAdapter
from app.brokers.dhan import DhanBrokerAdapter
from app.core.exceptions import BadRequestError

# Multi-broker registry mapping broker_id to adapter class
BROKER_REGISTRY: Dict[str, Type[BaseBrokerAdapter]] = {
    "dhan": DhanBrokerAdapter,
}

SUPPORTED_BROKERS = [
    {
        "id": "dhan",
        "name": "Dhan (DhanHQ API v2)",
        "country": "India (NSE/BSE/MCX)",
        "features": ["Trade Sync", "Execution Book", "Account Balance", "Positions"],
        "status": "active",
        "auth_fields": [
            {"key": "client_id", "label": "Dhan Client ID", "type": "text", "required": True},
            {"key": "access_token", "label": "Dhan Access Token (JWT)", "type": "password", "required": True},
        ],
    },
    {
        "id": "mt5",
        "name": "MetaTrader 5 (MT5)",
        "country": "Global / Forex / Futures",
        "features": ["Desktop Terminal Gateway", "Forex Fills", "Historical Deals"],
        "status": "planned_gateway",
        "auth_fields": [
            {"key": "gateway_url", "label": "MT5 Gateway Service URL", "type": "text", "required": True},
            {"key": "api_key", "label": "Gateway Auth Token", "type": "password", "required": True},
        ],
    },
]


def get_broker_adapter(broker_id: str, client_id: str, access_token: str) -> BaseBrokerAdapter:
    """Instantiate the registered broker adapter."""
    adapter_cls = BROKER_REGISTRY.get(broker_id.lower())
    if not adapter_cls:
        raise BadRequestError(f"Unsupported broker provider: '{broker_id}'")
    return adapter_cls(client_id=client_id, access_token=access_token)
