import base64
import json
import numpy
import types
from bson import ObjectId

from flask import jsonify
from flask import Flask, request
from flask_cors import CORS

from flask_pymongo import PyMongo

print("Three Body API Server Started .........")

app = Flask(__name__)
# app.config['MONGO_URI'] = 'mongodb://localhost/MyDatabase'
app.config['MONGO_URI'] = 'mongodb://database/MyDatabase'
mongo = PyMongo(app)

CORS(app)

class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return json.JSONEncoder.default(self, o)

def three_body_problem(input):
	m1 = numpy.float64(input['body_1']['m'])
	m2 = numpy.float64(input['body_2']['m'])
	m3 = numpy.float64(input['body_3']['m'])

	x1 = numpy.float64(input['body_1']['x'])
	y1 = numpy.float64(input['body_1']['y'])
	z1 = numpy.float64(input['body_1']['z'])
	
	x2 = numpy.float64(input['body_2']['x'])
	y2 = numpy.float64(input['body_2']['y'])
	z2 = numpy.float64(input['body_2']['z'])
	
	x3 = numpy.float64(input['body_3']['x'])
	y3 = numpy.float64(input['body_3']['y'])
	z3 = numpy.float64(input['body_3']['z'])

	v1x = 0.0
	v1y = 0.0
	v1z = 0.0

	v2x = 0.0
	v2y = 0.0
	v2z = 0.0

	v3x = 0.0
	v3y = 0.0
	v3z = 0.0

	G = numpy.float64(input['G']) # m3 / kg s2
	time_span = numpy.float64(input['time_span']) # s
	interval = numpy.float64(input['interval']) # s
	steps = int(time_span / interval)

	# three indices: which time, which star, xyz
	m = [m1, m2, m3]
	pos = numpy.zeros([steps + 1, 3, 3]) # m
	vel = numpy.zeros([steps + 1, 3, 3]) # m / s

	pos[0] = numpy.array([[x1, y1, z1], [x2, y2, z2], [x3, y3, z3]])
	vel[0] = numpy.array([[v1x, v1y, v1z],[v2x, v2y, v2z],[v3x, v3y, v3z]])

	def acceleration(pos):
		a = numpy.zeros([3,3])
		a[0] = G*m2/numpy.linalg.norm(pos[0]-pos[1])**3*(pos[1]-pos[0])+G*m3/numpy.linalg.norm(pos[0]-pos[2])**3*(pos[2]-pos[0])
		a[1] = G*m1/numpy.linalg.norm(pos[1]-pos[0])**3*(pos[0]-pos[1])+G*m3/numpy.linalg.norm(pos[1]-pos[2])**3*(pos[2]-pos[1])
		a[2] = G*m1/numpy.linalg.norm(pos[2]-pos[0])**3*(pos[0]-pos[2])+G*m2/numpy.linalg.norm(pos[2]-pos[1])**3*(pos[1]-pos[2])
		return a

	for step in range(steps):
		pos[step+1] = pos[step] + interval*vel[step]
		vel[step+1] = vel[step] + interval*acceleration(pos[step+1])

	return pos, vel, m

def get_result_json(positions, m):
	x1 = positions[:, 0, 0]
	y1 = positions[:, 0, 1]
	z1 = positions[:, 0, 2]

	x1 = x1.tolist()
	y1 = y1.tolist()
	z1 = z1.tolist()

	x1_str = json.dumps(x1)
	y1_str = json.dumps(y1)
	z1_str = json.dumps(z1)

	x2 = positions[:, 1, 0]
	y2 = positions[:, 1, 1]
	z2 = positions[:, 1, 2]

	x2 = x2.tolist()
	y2 = y2.tolist()
	z2 = z2.tolist()

	x2_str = json.dumps(x2)
	y2_str = json.dumps(y2)
	z2_str = json.dumps(z2)

	x3 = positions[:, 2, 0]
	y3 = positions[:, 2, 1]
	z3 = positions[:, 2, 2]

	x3 = x3.tolist()
	y3 = y3.tolist()
	z3 = z3.tolist()

	x3_str = json.dumps(x3)
	y3_str = json.dumps(y3)
	z3_str = json.dumps(z3)

	return '{"bodies":[' + '{"m":' + str(m[0]) + ',' + '"x":' + x1_str + ',' + '"y":' + y1_str + ',' + '"z":' + z1_str + '},' + '{"m":' + str(m[1]) + ',' + '"x":' + x2_str + ',' + '"y":' + y2_str + ',' + '"z":' + z2_str + '},' + '{"m":' + str(m[2]) + ',' + '"x":' + x3_str + ',' + '"y":' + y3_str + ',' + '"z":' + z3_str + '} ]}'

last_result = "{}"

def set_last_result(result):
	global last_result
	last_result = result

def get_last_result():
	global last_result
	return last_result


# mass = []
@app.route("/")
def running():
	return "[OK] Three Body API Running ....... ";

@app.route('/API/solve', methods = ['POST'])
def solve():
	positions, vel, mass = three_body_problem(request.json)
	print('Request Input : ' + str(request.json))
	print('Total ' + str(positions.size/9) + ' points served')
	result = get_result_json(positions, mass)
	set_last_result(result)
	# print(last_result)
	return result

@app.route('/API/save_last', methods = ['POST'])
def save_last():
	print("++++++++++++++++++++++++++++++++++")
	# print(">> " + str(request.json))
	# result = json.loads(request.json)
	presets = mongo.db.presets
	try:
		preset_id = presets.insert_one(request.json).inserted_id
		print("Preset Saved : " + str(preset_id))
		return '{"preset_id":"' + str(preset_id) +'"}'
	except:
		print('No preset to save')
	return '{"error":"1"}'

@app.route('/API/list_presets', methods = ['GET'])
def list_preset():
	try:
		presets = mongo.db.presets
		preset_ids = presets.find().distinct('_id')
		print("Sending Preset List")
		return JSONEncoder().encode(preset_ids)
	except:
		print('No preset to list')
	return '{"error":"1"}'

@app.route('/API/load_preset', methods = ['POST'])
def load_preset():
	print(request.json['id'])
	try:
		preset = mongo.db.presets.find_one({"_id" : ObjectId(request.json['id'])})
		print("Sending Preset : " + str(request.json['id']))
		return JSONEncoder().encode(preset)
	except:
		print('No preset to load')
	return '{"error":"1"}'

if __name__ == '__main__':
	app.run(debug=True,host='0.0.0.0', port=5000)
