# Настройка базы данных Supabase

Для работы приложения необходимо настроить проект Supabase.
Перейдите в SQL Editor в панели управления Supabase и выполните следующий скрипт:

```sql
-- Включение расширения UUID
create extension if not exists "uuid-ossp";

-- 1. Создание таблицы заказов
create table orders (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  rank text not null, -- 'SS', 'S', 'A', 'B', 'C'
  max_slots int default 1,
  taken_slots int default 0,
  reward_points int default 0,
  status text default 'open', -- 'open', 'completed'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Создание таблицы исполнителей заказов (студенты, взявшие задание)
create table order_takers (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references orders(id) on delete cascade,
  student_name text not null,
  student_group text not null,
  comment text,
  status text default 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Создание таблицы магазина наград
create table rewards (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  price int not null,
  icon text default 'gift',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Создание таблицы студентов (для отслеживания баллов)
create table students (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  student_group text not null,
  total_points int default 0,
  unique(name, student_group)
);

-- 5. Таблица для заявок на покупку товаров
CREATE TABLE reward_purchases (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  reward_id uuid REFERENCES rewards(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_group text NOT NULL,
  quantity int DEFAULT 1 CHECK (quantity > 0 AND quantity <= 10),
  total_price int NOT NULL,
  comment text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delivered')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 6. Политики безопасности на уровне строк (RLS)
alter table orders enable row level security;
alter table order_takers enable row level security;
alter table rewards enable row level security;
alter table students enable row level security;
ALTER TABLE reward_purchases ENABLE ROW LEVEL SECURITY;

-- Политики для 'orders'
create policy "Публичное чтение заказов" on orders for select using (true);
create policy "Админы могут создавать заказы" on orders for insert with check (auth.role() = 'authenticated');
create policy "Админы могут обновлять заказы" on orders for update using (auth.role() = 'authenticated');
create policy "Админы могут удалять заказы" on orders for delete using (auth.role() = 'authenticated');

-- Политики для 'order_takers'
create policy "Публичное создание заявок на выполнение" on order_takers for insert with check (true);
create policy "Публичное чтение заявок на выполнение" on order_takers for select using (true);
create policy "Админы могут обновлять заявки на выполнение" on order_takers for update using (auth.role() = 'authenticated');

-- Политики для 'rewards'
create policy "Публичное чтение наград" on rewards for select using (true);
create policy "Админы управляют наградами" on rewards for all using (auth.role() = 'authenticated');

-- Политики для 'students'
create policy "Публичное чтение студентов" on students for select using (true);
create policy "Админы управляют студентами" on students for all using (auth.role() = 'authenticated');

-- Политики для 'reward_purchases'
CREATE POLICY "Студенты могут создавать заявки на покупку" ON reward_purchases
FOR INSERT WITH CHECK (true);

CREATE POLICY "Админы могут читать все заявки на покупку" ON reward_purchases
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Админы могут обновлять заявки на покупку" ON reward_purchases
FOR UPDATE USING (auth.role() = 'authenticated');

-- 7. Индексы для reward_purchases
CREATE INDEX IF NOT EXISTS idx_reward_purchases_status ON reward_purchases(status);
CREATE INDEX IF NOT EXISTS idx_reward_purchases_student ON reward_purchases(student_name, student_group);

-- 8. Функция для проверки баланса при вставке
CREATE OR REPLACE FUNCTION check_balance_before_purchase()
RETURNS TRIGGER AS $$
DECLARE
  student_balance integer;
BEGIN
  -- Получаем баланс студента
  SELECT total_points INTO student_balance 
  FROM students 
  WHERE name = NEW.student_name 
    AND student_group = NEW.student_group;
  
  -- Если студент не найден или баланс меньше требуемой суммы
  IF student_balance IS NULL THEN
    RAISE EXCEPTION 'Студент не найден или не имеет баллов';
  ELSIF student_balance < NEW.total_price THEN
    RAISE EXCEPTION 'Недостаточно баллов. Требуется: %, есть: %', NEW.total_price, student_balance;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для проверки перед вставкой заявки
CREATE TRIGGER validate_purchase_balance
BEFORE INSERT ON reward_purchases
FOR EACH ROW
EXECUTE FUNCTION check_balance_before_purchase();