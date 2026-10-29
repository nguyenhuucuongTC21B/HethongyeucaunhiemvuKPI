#!/bin/bash
# Tạo dữ liệu demo cho hệ thống QLNV-KPI (chạy local, không commit)
set -e
BASE="http://localhost:3000"

# 1. Đăng nhập
curl -s -c /tmp/u.txt -X POST $BASE/api/auth/login -H "Content-Type: application/json" -d '{"identifier":"nguoidung","password":"NguoiDung@123"}' -o /dev/null
curl -s -c /tmp/a.txt -X POST $BASE/api/auth/login -H "Content-Type: application/json" -d '{"identifier":"admin","password":"Admin@123"}' -o /dev/null
curl -s -c /tmp/t1.txt -X POST $BASE/api/auth/login -H "Content-Type: application/json" -d '{"identifier":"kythuat","password":"KyThuat@123"}' -o /dev/null
curl -s -c /tmp/t2.txt -X POST $BASE/api/auth/login -H "Content-Type: application/json" -d '{"identifier":"kythuat2","password":"KyThuat@123"}' -o /dev/null

create() {
  curl -s -b /tmp/u.txt -X POST $BASE/api/tasks \
    -F "type=$1" -F "requesterName=$2" -F "department=$3" -F "position=$4" \
    -F "cccd=$5" -F "title=$6" -F "description=$7" -F "urgency=$8" \
    -F "phone=$9" -F "location=${10}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','ERR'))"
}

# (type, requester, dept, position, cccd, title, desc, urgency, phone, location)
ID1=$(create "Phiên Hội nghị / họp Kết nối trực tuyến" "Nguyễn Văn Hùng" "Khu vực 3" "Kiểm sát viên Trung cấp" "030001010001" "Hỗ trợ phiên họp trực tuyến tuyến KV3" "Cần kỹ thuật setup phòng họp trực tuyến cho phiên xét xử sáng thứ Hai, kiểm tra âm thanh, camera và đường truyền." "Gấp" "0901111001" "Phòng họp khu vực 3")
ID2=$(create "Sửa máy in – photocopy" "Trần Thị Mai" "Văn phòng" "Chuyên viên" "030001010002" "Máy in photocopy kẹt giấy liên tục" "Máy photocopy ở văn phòng bị kẹt giấy mỗi khi in, đã vệ sinh khay giấy nhưng không hết." "Bình thường" "0901111002" "Phòng Văn phòng, tầng 1")
ID3=$(create "Khắc phục lỗi Ký số / Token" "Lê Văn Đức" "Phòng 7" "Kiểm sát viên cao cấp" "030001010003" "Token ký số báo lỗi khi ký văn bản" "Token USB ký số báo lỗi 'certificate not found' khi ký báo cáo tuần. Đã cài lại driver." "Rất gấp" "0901111003" "Phòng 7, tầng 3")
ID4=$(create "Cài đặt / Update Windows" "Phạm Thị Hồng" "Phòng 9" "Chuyên viên" "030001010004" "Nâng cấp Windows cho máy trạm PV9-03" "Máy tính còn Windows 10, đề nghị nâng cấp lên bản được phép dùng và cập nhật bản vá bảo mật mới." "Bình thường" "0901111004" "Phòng 9, tầng 4")
ID5=$(create "Sửa lỗi kết nối đường truyền" "Hoàng Minh Tuấn" "Khu vực 11" "Điều tra viên" "030001010005" "Mất mạng nội bộ phòng làm việc KV11" "Toàn bộ máy tính ở khu vực 11 mất kết nối mạng nội bộ từ 8h sáng nay, wifi không vào được." "Rất gấp" "0901111005" "Khu vực 11")
ID6=$(create "Hỗ trợ nhập liệu" "Đỗ Thị Nhung" "Thanh tra – Khiếu tố" "Kiểm tra viên" "030001010006" "Hỗ trợ nhập dữ liệu hồ sơ thanh tra Q4" "Cần hỗ trợ nhập liệu danh mục hồ sơ thanh tra quý 4 vào phần mềm theo file Excel đính kèm (sẽ gửi sau)." "Bình thường" "0901111006" "Phòng Thanh tra")
ID7=$(create "Vá lỗi phần mềm" "Ngô Quốc Bảo" "Phòng 10" "Chuyên viên" "030001010007" "Phần mềm quản lý hồ sơ báo lỗi Font" "Mở hồ sơ bằng phần mềm quản lý ngành hiển thị sai font tiếng Việt, không in được biểu mẫu." "Gấp" "0901111007" "Phòng 10, tầng 2")
ID8=$(create "Yêu cầu viết ứng dụng / phần mềm" "Bùi Thị Lan" "Lãnh đạo Viện TP" "Phó Viện trưởng" "030001010008" "Đề xuất phần mềm quản lý lịch trực ban" "Đề nghị Bộ phận Kỹ thuật khảo sát, viết phần mềm quản lý lịch trực ban của Viện thay thế file Excel hiện tại." "Bình thường" "0901111008" "Ban Lãnh đạo")

echo "Created: $ID1 $ID2 $ID3 $ID4 $ID5 $ID6 $ID7 $ID8"

# 2. Phân công
assign() { curl -s -b /tmp/a.txt -X POST $BASE/api/tasks/$1/assign -H "Content-Type: application/json" -d "{\"assigneeId\":\"$2\",\"action\":\"assign\"}" -o /dev/null; }
T1=$(curl -s -b /tmp/a.txt "http://localhost:3000/api/users?role=technician" | python3 -c "import sys,json; us=json.load(sys.stdin)['items']; print(next(u['id'] for u in us if u['username']=='kythuat'))")
T2=$(curl -s -b /tmp/a.txt "http://localhost:3000/api/users?role=technician" | python3 -c "import sys,json; us=json.load(sys.stdin)['items']; print(next(u['id'] for u in us if u['username']=='kythuat2'))")
assign $ID1 $T1; assign $ID2 $T1; assign $ID3 $T2; assign $ID4 $T1; assign $ID5 $T2; assign $ID7 $T1
echo "Assigned"

# 3. Kỹ thuật xử lý
status() { curl -s -b $1 -X POST $BASE/api/tasks/$2/status -H "Content-Type: application/json" -d "{\"to\":\"$3\",\"note\":\"$4\"}" -o /dev/null; }
status /tmp/t1.txt $ID1 "Đã tiếp nhận" "Nhận phục vụ phiên họp"
status /tmp/t1.txt $ID1 "Đang xử lý" "Đang kiểm tra thiết bị phòng họp"
status /tmp/t1.txt $ID1 "Hoàn thành" "Đã setup xong camera, micro, đường truyền. Test liên hệ với tòa tương tác thành công."
status /tmp/t1.txt $ID2 "Đã tiếp nhận" "Đã tiếp nhận máy in"
status /tmp/t1.txt $ID2 "Đang xử lý" "Đang thay bộ kéo giấy"
status /tmp/t1.txt $ID4 "Đã tiếp nhận" "Lên lịch nâng cấp ngoài giờ"
status /tmp/t1.txt $ID4 "Đang xử lý" "Sao lưu dữ liệu trước khi nâng cấp"
status /tmp/t1.txt $ID4 "Hoàn thành" "Đã nâng cấp Windows và vá bảo mật, kiểm tra phần mềm ngành chạy bình thường."
status /tmp/t1.txt $ID7 "Đã tiếp nhận" "Tiếp nhận lỗi font"
status /tmp/t1.txt $ID7 "Đang xử lý" "Kiểm tra bộ font và cấu hình máy in"
status /tmp/t1.txt $ID7 "Hoàn thành" "Đã cài lại bộ font chuẩn ngành và cấu hình lại máy in mặc định."

status /tmp/t2.txt $ID3 "Đã tiếp nhận" "Tiếp nhận lỗi token"
status /tmp/t2.txt $ID3 "Đang xử lý" "Cấp lại chứng thư số"
status /tmp/t2.txt $ID3 "Hoàn thành" "Đã cấp lại chứng thư số và cài đặt token thành công."
status /tmp/t2.txt $ID5 "Đã tiếp nhận" "Đang kiểm tra switch khu vực"
status /tmp/t2.txt $ID5 "Tạm hoãn" "Chờ đơn vị mạng xử lý cáp trục, dự kiến sáng mai tiếp tục."

# 4. Người gửi đánh giá
rate() { curl -s -b /tmp/u.txt -X POST $BASE/api/tasks/$1/rate -H "Content-Type: application/json" -d "{\"stars\":$2,\"comment\":\"$3\"}" -o /dev/null; }
rate $ID1 5 "Chuẩn bị chu đáo, phiên họp diễn ra suôn sẻ"
rate $ID4 4 "Nhanh, không mất dữ liệu"
rate $ID7 5 "Xử lý tận nơi trong buổi, cảm ơn"
rate $ID3 4 "Gọn gàng, đã ký được văn bản"

echo "Demo data OK"
