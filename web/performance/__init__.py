"""Realtime performance spine for DustPan."""

from .sampler import get_snapshot, iter_live_events

__all__ = ["get_snapshot", "iter_live_events"]
