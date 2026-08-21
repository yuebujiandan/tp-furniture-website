"""签单号生成工具（技术文档 §6.6.6 / PRD 7.4.4）。

规则：TP + YYYYMMDD + 4 位当日序号（如 TP202608190001），当日并发唯一（DB 唯一约束兜底重试）。
"""
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Contracts


def generate_contract_no(db: Session) -> str:
    """生成签单号：基于当日最大序号 + 1；冲突时递增重试（SQLite/PG 通用）。"""
    today = datetime.now()
    prefix = f"TP{today.strftime('%Y%m%d')}"
    for _ in range(10):
        last = (
            db.query(Contracts.contract_no)
            .filter(Contracts.contract_no.like(f"{prefix}%"))
            .order_by(Contracts.contract_no.desc())
            .first()
        )
        seq = int(last[0][-4:]) + 1 if last else 1
        no = f"{prefix}{seq:04d}"
        if not db.query(Contracts).filter(Contracts.contract_no == no).first():
            return no
        seq += 1
    raise RuntimeError("签单号生成失败")
