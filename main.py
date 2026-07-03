import uvicorn
from fastapi import FastAPI, Request, Form, HTTPException, status, Query
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

class User(BaseModel):
    id: int
    username: str
    password: str
    role: str

users_db = [
    User(id=1, username="admin", password="Admin123!", role="admin"),
    User(id=2, username="staff", password="Staff123!", role="staff"),
    User(id=3, username="waiter", password="Waiter123!", role="waiter"),
]

class MenuItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    stock: int

menu_items_db = [
    MenuItem(id=1, name="Idli Sambar", description="Authentic Nad", price=50.00, stock=100),
    MenuItem(id=2, name="Masala Dosa", description="Medu Dosa", price=80.00, stock=100),
    MenuItem(id=3, name="Medu Vada", description="Medu Vosa", price=40.00, stock=100),
    MenuItem(id=4, name="Pongal", description="Ven Pongal", price=60.00, stock=100),
    MenuItem(id=5, name="Parotta with Chicken Curry", description="Parotta with Chicken Curry", price=120.00, stock=100),
    MenuItem(id=6, name="Biryani", description="Chicken Biryani", price=150.00, stock=100),
]

class OrderItem(BaseModel):
    name: str
    quantity: int

class Order(BaseModel):
    id: int
    customer_name: str
    items: List[OrderItem]
    status: str
    total: float
    date: str

orders_db = []

current_user = None

class PlaceOrderRequest(BaseModel):
    customer_name: str
    items: List[Dict]

class EditOrderRequest(BaseModel):
    order_id: int
    customer_name: str
    items: List[Dict]

@app.get("/", response_class=HTMLResponse)
async def serve_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/login")
async def login_user(username: str = Form(...), password: str = Form(...)):
    user = next((u for u in users_db if u.username == username), None)
    if user and user.password == password:
        global current_user
        current_user = user
        return {"success": True, "role": user.role}
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

@app.post("/logout")
async def logout_user():
    global current_user
    current_user = None
    return {"success": True}

@app.get("/api/users")
async def get_users():
    if current_user and current_user.role == "admin":
        return users_db
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

@app.post("/api/users/add")
async def add_user(username: str = Form(...), password: str = Form(...), role: str = Form(...)):
    if current_user and current_user.role == "admin":
        new_id = len(users_db) + 1
        new_user = User(id=new_id, username=username, password=password, role=role)
        users_db.append(new_user)
        return {"success": True}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

@app.post("/api/users/delete")
async def delete_user(user_id: int = Form(...)):
    if current_user and current_user.role == "admin":
        global users_db
        users_db = [u for u in users_db if u.id != user_id]
        return {"success": True}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

@app.get("/api/menu")
async def get_menu():
    if current_user:
        return menu_items_db
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

@app.post("/api/menu/add")
async def add_menu_item(name: str = Form(...), price: float = Form(...), description: str = Form(...), stock: int = Form(...)):
    if current_user and current_user.role == "admin":
        new_id = len(menu_items_db) + 1
        new_item = MenuItem(id=new_id, name=name, description=description, price=price, stock=stock)
        menu_items_db.append(new_item)
        return {"success": True}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
    
@app.post("/api/menu/delete")
async def delete_menu_item(item_id: int = Form(...)):
    if current_user and current_user.role == "admin":
        global menu_items_db
        menu_items_db = [item for item in menu_items_db if item.id != item_id]
        return {"success": True, "message": "Menu item deleted successfully"}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

@app.post("/api/menu/update_stock")
async def update_stock(item_id: int = Form(...), quantity: int = Form(...)):
    if current_user and current_user.role in ["admin", "staff"]:
        item = next((i for i in menu_items_db if i.id == item_id), None)
        if item:
            item.stock = quantity
            return {"success": True}
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

@app.post("/api/menu/update_price")
async def update_price(item_id: int = Form(...), price: float = Form(...)):
    if current_user and current_user.role == "admin":
        item = next((i for i in menu_items_db if i.id == item_id), None)
        if item:
            item.price = price
            return {"success": True}
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

@app.get("/api/orders")
async def get_orders():
    if current_user:
        return orders_db
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

@app.post("/api/orders/place")
async def place_order(request_data: PlaceOrderRequest):
    if current_user and current_user.role == "waiter":
        total = 0.0
        for item_data in request_data.items:
            menu_item = next((i for i in menu_items_db if i.name == item_data["name"]), None)
            if menu_item and menu_item.stock >= item_data["quantity"]:
                total += menu_item.price * item_data["quantity"]
                menu_item.stock -= item_data["quantity"]
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock for {item_data['name']}")
        
        new_id = len(orders_db) + 1
        new_order = Order(id=new_id, customer_name=request_data.customer_name, items=request_data.items, status="pending", total=total, date=datetime.now().strftime("%d/%m/%Y, %H:%M:%S"))
        orders_db.append(new_order)
        return {"success": True, "message": "Order placed successfully"}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

@app.post("/api/orders/update_status")
async def update_order_status(order_id: int = Form(...), new_status: str = Form(...)):
    if current_user and current_user.role in ["staff", "admin"]:
        order = next((o for o in orders_db if o.id == order_id), None)
        if order:
            order.status = new_status
            return {"success": True}
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

@app.get("/api/admin/revenue_data")
async def get_revenue_data():
    if current_user and current_user.role == "admin":
        today = datetime.now()
        today_date_str = today.strftime("%d/%m/%Y")
        today_total = sum(o.total for o in orders_db if o.date.startswith(today_date_str))

        two_weeks_ago = today - timedelta(days=14)
        
        revenue_history = {}
        for order in orders_db:
            order_date_str = order.date.split(',')[0]
            try:
                order_date = datetime.strptime(order_date_str, "%d/%m/%Y")
            except ValueError:
                continue

            if order_date >= two_weeks_ago:
                revenue_history.setdefault(order_date_str, 0)
                revenue_history[order_date_str] += order.total
        
        sorted_history = sorted(revenue_history.items(), key=lambda x: datetime.strptime(x[0], "%d/%m/%Y"), reverse=True)

        return {
            "today_total": today_total,
            "revenue_history": [{"date": date, "total": total} for date, total in sorted_history]
        }
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

@app.get("/api/orders/date")
async def get_orders_by_date(date: str = Query(...)):
    if current_user and current_user.role in ["admin", "waiter"]:
        filtered_orders = [o for o in orders_db if o.date.startswith(date)]
        return filtered_orders
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

@app.get("/api/orders/item")
async def get_order_by_id(order_id: int = Query(...)):
    if current_user and current_user.role in ["waiter"]:
        order = next((o for o in orders_db if o.id == order_id), None)
        if order:
            return order
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

@app.post("/api/orders/delete")
async def delete_order(order_id: int = Form(...)):
    if current_user and current_user.role == "waiter":
        global orders_db
        order_to_delete = next((o for o in orders_db if o.id == order_id), None)
        if order_to_delete and order_to_delete.status in ["pending", "preparing"]:
            for item_data in order_to_delete.items:
                menu_item = next((i for i in menu_items_db if i.name == item_data["name"]), None)
                if menu_item:
                    menu_item.stock += item_data["quantity"]
            
            orders_db = [o for o in orders_db if o.id != order_to_delete.id]
            return {"success": True, "message": "Order deleted successfully"}
        elif not order_to_delete:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete an order that is ready or paid.")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")


@app.post("/api/orders/edit")
async def edit_order(request_data: EditOrderRequest):
    if current_user and current_user.role == "waiter":
        order_to_edit = next((o for o in orders_db if o.id == request_data.order_id), None)
        if not order_to_edit or order_to_edit.status not in ["pending", "preparing"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot edit this order.")

        for item_data in order_to_edit.items:
            menu_item = next((i for i in menu_items_db if i.name == item_data["name"]), None)
            if menu_item:
                menu_item.stock += item_data["quantity"]
        
        new_total = 0.0
        for item_data in request_data.items:
            menu_item = next((i for i in menu_items_db if i.name == item_data["name"]), None)
            if menu_item and menu_item.stock >= item_data["quantity"]:
                new_total += menu_item.price * item_data["quantity"]
                menu_item.stock -= item_data["quantity"]
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock for {item_data['name']}")

        order_to_edit.customer_name = request_data.customer_name
        order_to_edit.items = request_data.items
        order_to_edit.total = new_total
        order_to_edit.date = datetime.now().strftime("%d/%m/%Y, %H:%M:%S")

        return {"success": True, "message": "Order updated successfully"}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
    
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)